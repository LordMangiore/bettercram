export default function PrivacyPolicy({ dark, onBack }) {
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
            Privacy Policy
          </h1>
          <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Last updated: March 23, 2026
          </p>
        </div>

        <div className={`space-y-8 text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>1. Introduction</h2>
            <p>
              BetterCram ("we", "our", "us") is an AI-powered study platform operated by Nicho Mangiore. We are committed to protecting your privacy and being transparent about how we handle your information. This policy explains what data we collect, how we use it, and your rights regarding that data.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>2. Information We Collect</h2>
            <p className="mb-3">When you use BetterCram, we may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Google Profile Information:</strong> When you sign in with Google, we receive your name, email address, and profile picture. We use this to create and manage your account.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Study Content:</strong> Flashcard decks, study progress, quiz results, and study plans you create or generate within the platform.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Uploaded Documents:</strong> URLs to Google Docs or other documents you provide for flashcard generation. We process these to create study materials.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Usage Data:</strong> We use Plausible Analytics, a privacy-friendly, cookieless analytics service, to understand general usage patterns. This data is aggregated and does not personally identify you.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and operate the BetterCram study platform</li>
              <li>To generate AI-powered flashcards, quizzes, and study materials from your documents</li>
              <li>To save your study progress and preferences across sessions</li>
              <li>To process payments and manage your subscription</li>
              <li>To improve the platform and user experience</li>
              <li>To communicate with you about your account or service updates</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>4. Third-Party Services</h2>
            <p className="mb-3">BetterCram integrates with the following third-party services to provide its functionality:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Google OAuth:</strong> For secure authentication. We only receive the profile information you authorize.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Stripe:</strong> For payment processing. We never store your credit card information directly; Stripe handles all payment data securely.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Anthropic (Claude AI):</strong> For generating flashcards, quiz questions, tutoring responses, and study materials. Your document content is sent to Claude for processing.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>ElevenLabs:</strong> For text-to-speech audio generation in voice tutor and audio lesson features.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Firecrawl:</strong> For extracting content from document URLs you provide for flashcard generation.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Plausible Analytics:</strong> For privacy-friendly, cookieless website analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>5. Data Storage</h2>
            <p>
              Your study data (decks, cards, progress, and plans) is stored securely using Netlify Blobs, a managed storage service. Your data is associated with your user account and is not shared with other users unless you explicitly publish a deck to the community library.
            </p>
            <p className="mt-3 font-medium">
              We do not sell, rent, or trade your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>6. Cookies &amp; Local Storage</h2>
            <p>
              BetterCram uses minimal browser storage. We use localStorage to save your preferences (such as dark mode setting and active deck). We do not use tracking cookies. Our analytics provider, Plausible, is fully cookieless and does not track individual users.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>7. Community Decks</h2>
            <p>
              If you choose to publish a deck to the BetterCram community library, that deck's content (card fronts and backs, deck name, and category) becomes publicly accessible to other users. Your name may be displayed as the deck creator. You can unpublish a deck at any time.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>8. Your Rights</h2>
            <p className="mb-3">You have the following rights regarding your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Access:</strong> You can view all your study data within the app at any time.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Deletion:</strong> You can delete your entire account and all associated data from the app settings. This action is permanent and cannot be undone.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Data Portability:</strong> You can export your flashcard data at any time.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Correction:</strong> You can edit any of your study content directly within the app.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Withdraw Consent:</strong> You can stop using the service and delete your account at any time.</li>
            </ul>
            <p className="mt-3">
              These rights are provided in accordance with applicable data protection regulations, including the GDPR and CCPA. If you are a resident of the European Economic Area or California, you may have additional rights under these regulations.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>9. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, all associated data is permanently removed from our systems. We do not maintain backups of deleted accounts.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>10. Children's Privacy</h2>
            <p>
              BetterCram is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal data, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>11. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify users of any material changes by updating the "Last updated" date at the top of this page. Continued use of BetterCram after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>12. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or how we handle your data, please contact us at{" "}
              <a href="mailto:nicho@mangiore.com" className="text-indigo-500 hover:text-indigo-400 underline">
                nicho@mangiore.com
              </a>.
            </p>
          </section>
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
