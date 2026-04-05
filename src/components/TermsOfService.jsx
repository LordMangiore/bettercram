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
            Last updated: April 2, 2026
          </p>
        </div>

        <div className={`space-y-8 text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>1. Acceptance of Terms</h2>
            <p>
              By using BetterCram ("the Service"), operated by Nicho Mangiore, you agree to these Terms of Service. If you don't agree, please don't use the Service. We may update these terms from time to time — continued use means you accept any changes.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>2. What BetterCram Is</h2>
            <p>
              BetterCram is an AI-powered study platform. You bring the material — a URL, PDF, photos of your notes, or an Anki deck — and we turn it into flashcards, quizzes, audio lessons, and more. Features include spaced repetition, AI tutoring, voice tutoring with Nova, deep-dive research, community deck sharing, and study planning.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>3. Your Account</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You need a valid account to use BetterCram (sign in with your email).</li>
              <li>Keep your account secure — you're responsible for all activity under it.</li>
              <li>You must be at least 13 years old.</li>
              <li>One account per person. Don't create extras to game trials or features.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>4. Plans &amp; Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Free Trial:</strong> 30 days, full access, no credit card required.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Plans:</strong> Starter and Pro, available monthly or annually.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Billing:</strong> Processed securely through Stripe. Subscriptions auto-renew unless you cancel.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Cancellation:</strong> Cancel anytime from the billing portal. You keep access through the end of your current period.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Refunds:</strong> Handled case-by-case. Reach out to <a href="mailto:nicho@mangiore.com" className="text-indigo-500 hover:text-indigo-400 underline">nicho@mangiore.com</a>.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Price Changes:</strong> We'll give existing subscribers advance notice before any price changes.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>5. Play Nice</h2>
            <p className="mb-3">Don't use BetterCram to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload, generate, or share anything illegal, harmful, abusive, or objectionable.</li>
              <li>Violate any laws or regulations.</li>
              <li>Infringe on someone else's intellectual property.</li>
              <li>Try to hack, scrape, or break into the Service.</li>
              <li>Interfere with or disrupt the platform for other users.</li>
              <li>Publish content designed to mislead, harass, or harm others.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>6. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Your Stuff:</strong> Everything you upload, create, or generate is yours — your flashcards, notes, documents, all of it.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>Our Platform:</strong> BetterCram's design, code, branding, and technology belong to us and are protected by intellectual property laws.</li>
              <li><strong className={dark ? "text-white" : "text-gray-900"}>License to Us:</strong> You give us a limited license to process, store, and display your content so we can run the Service. Delete your content or account and that license ends.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>7. Community Decks</h2>
            <p className="mb-3">
              BetterCram has a community library where users can share decks publicly. Here's how it works:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>When you publish a deck, it becomes accessible to all BetterCram users.</li>
              <li>Others can subscribe to, clone, and study from your published decks.</li>
              <li>You can unpublish anytime — it'll be removed from the library.</li>
              <li>By publishing, you're confirming you have the right to share that content and that it doesn't infringe on anyone else's rights.</li>
              <li>We can remove any community deck that violates these terms or gets reported.</li>
            </ul>
            <div className={`mt-4 p-4 rounded-xl border ${dark ? "bg-gray-900/50 border-white/10" : "bg-gray-50 border-gray-200"}`}>
              <p className={`font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
                <i className="fa-solid fa-circle-info text-indigo-500 mr-2" />
                Community content is user-generated
              </p>
              <p>
                Community decks are created entirely by other users. BetterCram does not review, verify, endorse, or take responsibility for the accuracy, completeness, legality, or quality of any community-shared content. You study community decks at your own discretion.
              </p>
              <p className="mt-2">
                We are not liable for any claims, damages, or losses arising from user-uploaded content — including copyright issues, inaccurate information, offensive material, or any other harm from community decks.
              </p>
              <p className="mt-2">
                See something that shouldn't be there? Let us know at{" "}
                <a href="mailto:nicho@mangiore.com" className="text-indigo-500 hover:text-indigo-400 underline">nicho@mangiore.com</a>{" "}
                and we'll take care of it.
              </p>
            </div>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>8. AI-Generated Content</h2>
            <p>
              BetterCram uses AI (including Anthropic's Claude and ElevenLabs) to generate flashcards, quizzes, tutoring responses, audio lessons, and other study materials. We work hard to make it accurate, but AI can make mistakes — it may produce errors, inaccuracies, or gaps. Always double-check important information with your textbook, professor, or other authoritative sources. BetterCram is a study tool, not a replacement for professional instruction. We're not responsible for consequences arising from reliance on AI-generated content.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, BetterCram and its operator are not liable for any indirect, incidental, special, consequential, or punitive damages — including loss of data, profits, or goodwill — arising from your use of (or inability to use) the Service. The Service is provided "as is" and "as available" without warranties of any kind. Our total liability for any claim won't exceed what you've paid us in the 12 months before the claim.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>10. Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You can delete your account anytime from settings or by contacting us.</li>
              <li>We can suspend or terminate accounts that violate these terms or harm the community.</li>
              <li>When your account is terminated, your access ends and data is deleted per our Privacy Policy.</li>
              <li>Sections on intellectual property, liability, and disputes survive termination.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>11. Governing Law</h2>
            <p>
              These terms are governed by U.S. law. Any disputes will be resolved through good-faith negotiation first, and if needed, binding arbitration.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>12. Questions?</h2>
            <p>
              Reach out anytime at{" "}
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
