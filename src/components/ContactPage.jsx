import { useState } from "react";

export default function ContactPage({ dark, onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: "How do I get started with BetterCram?",
      a: "Simply click \"Sign in with Google\" on the homepage. You'll get a 7-day free trial with full access to all features, no credit card required. Once signed in, you can load a document or start studying with our sample decks.",
    },
    {
      q: "What file types can I use to generate flashcards?",
      a: "BetterCram works with Google Docs URLs. Paste the link to your document and our AI will extract the content and generate comprehensive flashcards, quiz questions, and study materials automatically.",
    },
    {
      q: "How does the AI tutor work?",
      a: "Nova, your AI voice tutor, uses Claude AI and ElevenLabs to provide interactive voice-based tutoring sessions. You can ask questions about any card in your deck, and Nova will explain concepts, provide mnemonics, and quiz you in real time.",
    },
    {
      q: "Can I share my decks with other students?",
      a: "Yes! You can publish any of your decks to the BetterCram community library. Other students can browse, subscribe to, or clone your decks. You can unpublish a deck at any time.",
    },
    {
      q: "How do I cancel my subscription?",
      a: "You can cancel anytime from the app. Go to your profile menu, click \"Manage Subscription,\" and you'll be taken to the Stripe billing portal where you can cancel. You'll keep access until the end of your billing period.",
    },
    {
      q: "Can I delete my account and data?",
      a: "Yes. Go to your profile menu and click \"Delete account.\" This permanently removes all your data including decks, cards, progress, and study plans. This action cannot be undone.",
    },
    {
      q: "Is my data safe?",
      a: "We take your privacy seriously. Your data is stored securely on Netlify Blobs, payments are processed by Stripe, and we never sell your information. See our Privacy Policy for full details.",
    },
    {
      q: "What's included in the free trial?",
      a: "The 7-day free trial gives you full access to all Pro features: AI tutor, voice tutoring with Nova, audio lessons, deep-dive research, unlimited decks, and the study planner. No credit card required to start.",
    },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`BetterCram Contact: Message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:nicho@mangiore.com?subject=${subject}&body=${body}`;
  }

  const inputClass = `w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${
    dark
      ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500"
      : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500"
  }`;

  return (
    <div className={`min-h-screen transition-colors ${dark ? "bg-gray-950 text-white" : "bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900"}`}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className={`mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
        >
          <i className="fa-solid fa-arrow-left" />
          Back to BetterCram
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <i className="fa-solid fa-bolt text-indigo-500" />
            Contact Us
          </h1>
          <p className={`${dark ? "text-gray-400" : "text-gray-500"}`}>
            Have a question, suggestion, or need help? We'd love to hear from you.
          </p>
        </div>

        {/* Contact info */}
        <div className={`rounded-2xl p-6 mb-10 ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-envelope text-indigo-500" />
              </div>
              <div>
                <h3 className={`font-semibold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Email</h3>
                <a href="mailto:nicho@mangiore.com" className="text-indigo-500 hover:text-indigo-400 text-sm">
                  nicho@mangiore.com
                </a>
                <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  We typically respond within 24 hours
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-globe text-indigo-500" />
              </div>
              <div>
                <h3 className={`font-semibold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Website</h3>
                <a href="https://bettercram.com" className="text-indigo-500 hover:text-indigo-400 text-sm">
                  bettercram.com
                </a>
                <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  Visit our homepage to get started
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div className="mb-16">
          <h2 className={`text-xl font-bold mb-6 ${dark ? "text-white" : "text-gray-900"}`}>
            Send a Message
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                required
                rows={5}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
            >
              <i className="fa-solid fa-paper-plane" />
              Send Message
            </button>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              This will open your email client with the message pre-filled.
            </p>
          </form>
        </div>

        {/* FAQ section */}
        <div>
          <h2 className={`text-xl font-bold mb-6 ${dark ? "text-white" : "text-gray-900"}`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`rounded-xl overflow-hidden transition-all ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                >
                  <span className={`text-sm font-medium ${dark ? "text-white" : "text-gray-900"}`}>
                    {faq.q}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs transition-transform ${dark ? "text-gray-500" : "text-gray-400"} ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className={`px-5 pb-4 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center text-sm ${dark ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400"}`}>
          <span>
            <i className="fa-solid fa-bolt text-indigo-500 mr-1" />
            BetterCram
          </span>
          <span className="mx-2">&middot;</span>
          <span>bettercram.com</span>
        </div>
      </div>
    </div>
  );
}
