import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, returnUrl } = await req.json();

    if (!email) {
      return Response.json({ error: "Email required" }, { status: 400 });
    }

    // Find customer
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      return Response.json({ error: "no_customer", redirect: "pricing" }, { status: 404 });
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: returnUrl || "https://bettercram.com",
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Manage subscription error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
