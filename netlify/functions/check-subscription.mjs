import Stripe from "stripe";

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
      return Response.json({ active: false, plan: null });
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
    if (
      priceId === "price_1TDz18E6n64xfKxiZkocCVZ1" ||
      priceId === "price_1TDz19E6n64xfKxiH0LX2o6O"
    ) {
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
