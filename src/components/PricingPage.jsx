import { useState } from "react";
import { createCheckout } from "../api";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    priceKey: "free",
    features: [
      "Flip cards & study mode",
      "Spaced repetition (FSRS)",
      "Create cards manually",
      "Streak & heat glow gamification",
      "Community decks",
      "Study planner with key dates",
      "Search & filter cards",
      "Dark mode",
    ],
    missing: [
      "AI-generated cards & quizzes",
      "AI Tutor",
      "Voice Tutor",
      "Audio lessons",
      "Deep dive research",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 9,
    interval: "month",
    priceKey: "starter_monthly",
    popular: true,
    features: [
      "Everything in Free, plus:",
      "AI-generated cards from documents",
      "AI-generated quizzes",
      "AI Tutor — explanations & mnemonics",
      "Audio card narration",
      "Push notification reminders",
    ],
    missing: [
      "Voice Tutor (ElevenLabs)",
      "Audio lessons",
      "Deep dive research",
    ],
  },
  {
    id: "pro_monthly",
    name: "Pro",
    price: 19,
    interval: "month",
    priceKey: "pro_monthly",
    features: [
      "Everything in Starter, plus:",
      "Voice Tutor — real-time conversation with Nova",
      "Audio study sessions",
      "Deep dive research with web sources",
      "Multiple document library",
      "Unlimited custom cards",
      "Priority support",
    ],
    missing: [],
  },
  {
    id: "pro_yearly",
    name: "Pro Annual",
    price: 149,
    interval: "year",
    priceKey: "pro_yearly",
    savings: "Save $79/yr",
    features: [
      "Everything in Pro",
      "Over 4 months free",
      "Lock in your rate",
    ],
    missing: [],
  },
];

export default function PricingPage({ email, onSubscribed, onBack, dark }) {
  const [loading, setLoading] = useState(null);

  async function handleSelect(plan) {
    setLoading(plan.priceKey);
    try {
      const result = await createCheckout(plan.priceKey, email);
      if (result.free) {
        onSubscribed({ active: true, plan: "pro", source: "whitelist" });
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <i className="fa-solid fa-arrow-left" />
            Back to studying
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Choose your plan
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Start with a 7-day free trial. No credit card required upfront. Cancel anytime.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col transition-all ${
                plan.popular
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02] border-2 border-indigo-400"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}
              {plan.savings && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-400 text-green-900 text-xs font-bold rounded-full">
                  {plan.savings}
                </div>
              )}

              <h3 className={`text-xl font-bold mb-1 ${plan.popular ? "" : "text-gray-900 dark:text-white"}`}>
                {plan.name}
              </h3>

              <div className="mb-4">
                <span className={`text-4xl font-bold ${plan.popular ? "" : "text-gray-900 dark:text-white"}`}>
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className={`text-sm ${plan.popular ? "text-indigo-200" : "text-gray-400"}`}>
                    /{plan.interval}
                  </span>
                )}
              </div>

              <button
                onClick={() => plan.price === 0 ? onBack?.() : handleSelect(plan)}
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6 ${
                  plan.popular
                    ? "bg-white text-indigo-600 hover:bg-indigo-50 shadow-md"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                } ${loading === plan.priceKey ? "opacity-70" : ""}`}
              >
                {loading === plan.priceKey ? (
                  <><i className="fa-solid fa-spinner fa-spin mr-2" />Processing...</>
                ) : (
                  plan.price === 0 ? "Get Started" : "Start 7-day free trial"
                )}
              </button>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${
                    plan.popular ? "text-indigo-100" : "text-gray-600 dark:text-gray-300"
                  }`}>
                    <i className={`fa-solid fa-check mt-0.5 ${plan.popular ? "text-indigo-300" : "text-green-500"}`} />
                    {f}
                  </li>
                ))}
                {plan.missing.map((f, i) => (
                  <li key={`m-${i}`} className={`flex items-start gap-2 text-sm ${
                    plan.popular ? "text-indigo-300" : "text-gray-400 dark:text-gray-500"
                  }`}>
                    <i className="fa-solid fa-xmark mt-0.5 text-gray-300 dark:text-gray-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Coupon note */}
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
          <i className="fa-solid fa-tag mr-1" />
          Have a coupon code? You can apply it during checkout.
        </p>
      </div>
    </div>
  );
}
