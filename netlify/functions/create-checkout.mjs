import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  pro_monthly: "price_1TEByGE6n64xfKxiSN7fkhFs", // $12/mo
  pro_yearly: "price_1TEBz1E6n64xfKxihyyqD2Wu", // $108/yr
};

// Emails that get free access
const FREE_EMAILS = (process.env.FREE_ACCESS_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { priceKey, email, successUrl, cancelUrl } = await req.json();

    // Check if email is whitelisted
    if (FREE_EMAILS.includes(email?.toLowerCase())) {
      return Response.json({ free: true });
    }

    const priceId = PRICES[priceKey];
    if (!priceId) {
      return Response.json({ error: "Invalid price key" }, { status: 400 });
    }

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const sessionParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://bettercram.com?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://bettercram.com?canceled=true",
      subscription_data: {
        trial_period_days: 30,
      },
      allow_promotion_codes: true,
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
