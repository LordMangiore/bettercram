export default function PrivacyPolicy({ dark, onBack }) {
  return (
    <div className={`min-h-screen transition-colors ${dark ? "bg-gray-950 text-white" : "bg-white text-gray-900"}`}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className={`mb-10 flex items-center gap-2 text-sm transition-colors ${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
        >
          <i className="fa-solid fa-arrow-left" />
          Back
        </button>

        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Last updated: March 28, 2026
          </p>
        </div>

        {/* The pledge */}
        <div className={`rounded-2xl p-6 mb-10 border ${dark ? "bg-indigo-500/5 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"}`}>
          <h2 className={`text-lg font-bold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>
            <i className="fa-solid fa-shield-check text-green-500 mr-2" />
            Our promise
          </h2>
          <ul className={`space-y-2 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
            <li><strong className={dark ? "text-white" : "text-gray-900"}>We will never sell your data.</strong> Not to advertisers, not to data brokers, not to anyone. Ever.</li>
            <li><strong className={dark ? "text-white" : "text-gray-900"}>We only collect exactly what we need.</strong> Nothing more. If we don't need it to make the app work for you, we don't collect it.</li>
            <li><strong className={dark ? "text-white" : "text-gray-900"}>Your study data is yours.</strong> You can delete everything at any time and we won't keep copies.</li>
          </ul>
        </div>

        <p className={`text-xs italic mb-10 ${dark ? "text-gray-600" : "text-gray-400"}`}>
          The stuff above is the real version. The stuff below is the version lawyers make you write. Same promises, more words.
        </p>

        <div className={`space-y-8 text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>1. Introduction</h2>
            <p>
              BetterCram ("we", "our", "us") is an AI-powered study platform built by Nicholas and Anna Mangiore. We are committed to protecting your privacy and being transparent about how we handle your information. This policy explains what data we collect, how we use it, and your rights.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>2. Information We Collect</h2>
            <p className="mb-3">We collect the minimum information needed to make BetterCram work:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Email address:</strong> When you sign in via email OTP, we collect your email to create and manage your account. That's it. No passwords are stored on our servers.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Study content:</strong> Flashcard decks, study progress, quiz results, and study plans you create or generate.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Documents you share:</strong> URLs you provide for flashcard generation. We process these to create study materials, then the raw content is discarded.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Usage analytics:</strong> We use Plausible Analytics, a privacy-friendly, cookieless analytics service. This data is aggregated and cannot identify you personally.</li>
            </ul>
            <p className="mt-3">We do <strong className={dark ? "text-white" : "text-gray-900"}>not</strong> collect: your location, your contacts, your browsing history, biometric data, or anything from your device beyond what the app needs to function.</p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and operate the BetterCram study platform</li>
              <li>To generate AI-powered flashcards, quizzes, and study materials from your documents</li>
              <li>To save your study progress and preferences across sessions and devices</li>
              <li>To process payments and manage your subscription via Stripe</li>
              <li>To send push notification study reminders (only if you opt in)</li>
              <li>To improve the platform based on aggregated, anonymized usage patterns</li>
            </ul>
            <p className="mt-3">We do <strong className={dark ? "text-white" : "text-gray-900"}>not</strong> use your data for advertising, profiling, or any purpose unrelated to making your study experience better.</p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>4. Third-Party Services</h2>
            <p className="mb-3">BetterCram integrates with the following services. Each receives only the data it needs to do its job:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Firebase:</strong> For authentication and database services. Your email and study data are stored securely in Google Cloud infrastructure.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Stripe:</strong> For payment processing. We never see or store your credit card information. Stripe handles all payment data.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Anthropic (Claude):</strong> For generating flashcards, quiz questions, tutoring responses, and study materials. Your document content is sent to Claude for processing. Anthropic does not use your data to train their models.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>ElevenLabs:</strong> For voice tutor (Nova) and audio lesson features. Card content is sent for text-to-speech generation.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Firecrawl:</strong> For extracting content from URLs you provide for flashcard generation.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Resend:</strong> For sending OTP login codes to your email. We only send transactional emails. No marketing, no newsletters, no spam.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Plausible Analytics:</strong> For privacy-friendly, cookieless website analytics. No personal data is collected.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>5. Data Storage & Security</h2>
            <p className="mb-3">
              Your study data is stored across two systems: Google Cloud Firestore for metadata, progress, and real-time sync, and Netlify Blob storage for card content and cached resources. Both are encrypted in transit and at rest.
            </p>
            <p className="mb-3">
              Your data is associated with your account and is never shared with other users unless you explicitly publish a deck to the community library.
            </p>
            <p className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
              We will never sell, rent, or trade your personal information to any third party. Period.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>6. Cookies & Local Storage</h2>
            <p>
              BetterCram uses minimal browser storage. We use localStorage and IndexedDB to save your login session, preferences, and cached study data for offline access. We do not use tracking cookies. Our analytics provider (Plausible) is fully cookieless and does not track individual users.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>7. Community Decks</h2>
            <p>
              If you publish a deck to the community library, that deck's content (card fronts, backs, and deck name) becomes publicly accessible. Your name may be displayed as the creator. You can unpublish a deck at any time, and it will be removed from the community library immediately.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>8. Your Rights</h2>
            <p className="mb-3">Your data, your rules:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Access:</strong> You can view all your study data within the app at any time.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Deletion:</strong> You can delete your entire account and all associated data from app settings. This is permanent and immediate.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Portability:</strong> Your data is yours. You can export it at any time.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Correction:</strong> You can edit any of your content directly in the app.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Opt out:</strong> You can disable push notifications, delete your account, or stop using the service at any time with no penalty.</li>
            </ul>
            <p className="mt-3">
              These rights apply regardless of where you live. If you're in the EU or California, you have additional protections under GDPR and CCPA respectively.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>9. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, all associated data is permanently removed. We do not maintain backups of deleted accounts and we do not retain data for analytics after deletion.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>10. Children's Privacy</h2>
            <p>
              BetterCram is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, contact us and we will delete it immediately.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>11. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We'll update the date at the top when we do. If we make material changes that affect how your data is handled, we'll notify you directly. Continued use of BetterCram after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>12. Contact</h2>
            <p>
              Questions about your privacy or how we handle your data? Email us at{" "}
              <a href="mailto:nicho@mangiore.com" className="text-indigo-500 hover:text-indigo-400 underline">
                nicho@mangiore.com
              </a>. We'll respond personally. Because there's only two of us.
            </p>
          </section>
        </div>

        <div className={`mt-12 pt-8 border-t text-center text-sm ${dark ? "border-white/10 text-gray-600" : "border-gray-200 text-gray-400"}`}>
          <i className="fa-solid fa-bolt text-indigo-500 mr-1" />
          BetterCram &middot; Built by students, for students
        </div>
      </div>
    </div>
  );
}
