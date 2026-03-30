import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Emails that get free access
const FREE_EMAILS = (process.env.FREE_ACCESS_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: "Email required" }, { status: 400 });
    }

    // Check whitelist first
    if (FREE_EMAILS.includes(email.toLowerCase())) {
      return Response.json({
        active: true,
        plan: "pro",
        source: "whitelist",
        interval: "lifetime",
      });
    }

    // Check Stripe for active subscription
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      // No Stripe customer — check if they have a free trial via blob store
      const trialStore = getStore("trials");
      const emailKey = email.toLowerCase().replace(/[^a-z0-9]/g, "-");
      let trialData;
      try {
        trialData = await trialStore.get(emailKey, { type: "json" });
      } catch {}

      if (!trialData || !trialData.startedAt) {
        // First time — start 30-day trial
        trialData = { startedAt: new Date().toISOString(), email: email.toLowerCase() };
        await trialStore.setJSON(emailKey, trialData);
      }

      const trialStart = new Date(trialData.startedAt);
      // Guard against invalid dates
      if (isNaN(trialStart.getTime())) {
        // Reset trial data if corrupted
        trialData = { startedAt: new Date().toISOString(), email: email.toLowerCase() };
        await trialStore.setJSON(emailKey, trialData);
      }

      const validStart = new Date(trialData.startedAt);
      const trialEnd = new Date(validStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      const isTrialActive = Date.now() < trialEnd.getTime();

      if (isTrialActive) {
        return Response.json({
          active: true,
          plan: "pro",
          status: "free_trial",
          source: "auto_trial",
          trialEnd: trialEnd.toISOString(),
        });
      } else {
        return Response.json({
          active: false,
          plan: null,
          trialExpired: true,
          trialEnd: trialEnd.toISOString(),
        });
      }
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
    });

    // Find active or trialing subscription
    const activeSub = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (!activeSub) {
      return Response.json({ active: false, plan: null });
    }

    const priceId = activeSub.items.data[0]?.price?.id;
    let plan = "starter";
    // Pro monthly or Pro annual (live keys)
    if (
      priceId === "price_1TEHqjE6n64xfKxisSUqamF0" || // Pro $25/mo (new)
      priceId === "price_1TEBycE6n64xfKxiHdWfq2OC" || // Pro $19/mo (old)
      priceId === "price_1TEBz1E6n64xfKxihyyqD2Wu" || // Pro Annual $149/yr
      // Old test keys (backwards compat)
      priceId === "price_1TDz18E6n64xfKxiZkocCVZ1" ||
      priceId === "price_1TDz19E6n64xfKxiH0LX2o6O"
    ) {
      plan = "pro";
    }

    // Trialing users get full Pro access regardless of plan
    if (activeSub.status === "trialing") {
      plan = "pro";
    }

    return Response.json({
      active: true,
      plan,
      status: activeSub.status,
      interval: activeSub.items.data[0]?.price?.recurring?.interval,
      trialEnd: activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null,
      currentPeriodEnd: new Date(activeSub.current_period_end * 1000).toISOString(),
    });
  } catch (err) {
    console.error("Subscription check error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
