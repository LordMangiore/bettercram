export default function TermsOfService({ dark, onBack }) {
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
            Terms of Service
          </h1>
          <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Last updated: March 23, 2026
          </p>
        </div>

        <div className={`space-y-8 text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using BetterCram ("the Service"), operated by Nicho Mangiore, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. We reserve the right to update these terms at any time, and continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>2. Service Description</h2>
            <p>
              BetterCram is an AI-powered study platform that allows users to generate flashcards, quizzes, and study materials from uploaded documents. The Service includes features such as flip cards, smart quizzes, an AI tutor, voice tutoring, audio lessons, deep-dive research, community deck sharing, and study planning tools.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>3. Account Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must sign in using a valid Google account to use BetterCram.</li>
              <li>You are responsible for maintaining the security of your Google account and any activity that occurs under your BetterCram account.</li>
              <li>You must provide accurate information and keep your account details up to date.</li>
              <li>You must be at least 13 years old to use the Service.</li>
              <li>You may not create multiple accounts to abuse free trials or other features.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>4. Subscription &amp; Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Free Trial:</strong> New users receive a 30-day free trial with full access to all features. No credit card is required to start the trial.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Plans:</strong> BetterCram offers a Starter plan and a Pro plan, available on monthly or annual billing cycles.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Billing:</strong> All payments are processed securely through Stripe. Subscriptions automatically renew at the end of each billing period unless cancelled.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Cancellation:</strong> You can cancel your subscription at any time through the billing portal. You will retain access to paid features until the end of your current billing period.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Refunds:</strong> Refund requests are handled on a case-by-case basis. Please contact us at nicho@mangiore.com for assistance.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Price Changes:</strong> We reserve the right to change pricing. Existing subscribers will be notified in advance of any price changes.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>5. Acceptable Use</h2>
            <p className="mb-3">You agree not to use BetterCram to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload, generate, or share content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable.</li>
              <li>Violate any applicable laws or regulations.</li>
              <li>Infringe on the intellectual property rights of others.</li>
              <li>Attempt to gain unauthorized access to the Service or its systems.</li>
              <li>Use automated tools, bots, or scrapers to access the Service without permission.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
              <li>Share or publish content intended to mislead, harass, or harm other users.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>6. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Your Content:</strong> You retain ownership of any content you upload, create, or generate using BetterCram, including your flashcards, study notes, and documents.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Our Platform:</strong> The BetterCram platform, including its design, code, branding, and proprietary technology, is owned by us and protected by intellectual property laws.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>License to Us:</strong> By using the Service, you grant us a limited license to process, store, and display your content as necessary to provide the Service. This license ends when you delete your content or account.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>7. Community Decks</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>When you publish a deck to the BetterCram community library, that deck's content becomes publicly accessible to all users.</li>
              <li>Other users may subscribe to, clone, or study from your published decks.</li>
              <li>You may unpublish a community deck at any time, which will remove it from the public library.</li>
              <li>You represent that you have the right to share any content you publish to the community library.</li>
              <li>We reserve the right to remove any community deck that violates these terms or is reported as inappropriate.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>8. AI-Generated Content Disclaimer</h2>
            <p>
              BetterCram uses artificial intelligence (including Anthropic's Claude) to generate flashcards, quiz questions, tutoring responses, audio content, and other study materials. While we strive for accuracy, AI-generated content may contain errors, inaccuracies, or omissions. You should always verify important information with authoritative sources. BetterCram is a study aid and is not a substitute for professional instruction, textbooks, or expert guidance. We are not responsible for any consequences arising from reliance on AI-generated content.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, BetterCram and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, profits, or goodwill, arising from your use of or inability to use the Service. The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>10. Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may terminate your account at any time by deleting it from the app settings or by contacting us.</li>
              <li>We reserve the right to suspend or terminate your account if you violate these terms, engage in abusive behavior, or use the Service in a manner that could harm other users or the platform.</li>
              <li>Upon termination, your access to the Service will cease and your data will be deleted in accordance with our Privacy Policy.</li>
              <li>Sections regarding intellectual property, limitation of liability, and dispute resolution survive termination.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>11. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these terms or the Service shall be resolved through good-faith negotiation, and if necessary, binding arbitration.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>12. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{" "}
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
