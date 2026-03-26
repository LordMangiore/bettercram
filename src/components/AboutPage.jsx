export default function AboutPage({ onBack, dark }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <i className="fa-solid fa-arrow-left" />
            Back
          </button>
        )}

        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            About BetterCram
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Built by a married couple who believes students deserve better tools.
          </p>
        </div>

        {/* Origin story */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">How it started</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Anna was studying for the MCAT while working full-time as a CT/Nuclear Medicine Technologist. She jokingly asked her husband Nicho — who works in product and tech — if he could either do the dishes or build an app that auto-generates flashcards from her Google Docs. Within 24 hours, BetterCram was live — with way more features than either of them imagined.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We're not a big company with massive financial backing. Just two people working full-time who saw a problem and built a solution. The more people who use BetterCram, the better it gets — community decks grow, audio caches speed up, and every piece of feedback makes it stronger.
          </p>
        </div>

        {/* Team */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Nicho */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                N
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Nicholas (Nicho) Mangiore</h4>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">Product / Builder / The Guy Who Did the Dishes Once</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Product Owner at CCA Global Partners. Previously led digital transformation at Mecum Auctions for 5 years — building ERPs from scratch, managing Salesforce, and wearing every hat imaginable. Certified ScrumMaster (CSM) and Certified Scrum Product Owner (CSPO).
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-4">
              "My wife asked me to build her an AI flashcard app. I said easy. Anything to not have to do dishes."
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.linkedin.com/in/nicholas-m-3a313a101/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <i className="fa-brands fa-linkedin" /> LinkedIn
              </a>
            </div>
          </div>

          {/* Anna */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-2xl font-bold">
                A
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Anna Mangiore, BHSc</h4>
                <p className="text-sm text-pink-600 dark:text-pink-400">The reason this exists</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              R.T.(R)(N)(CT)(ARRT) — X-Ray, CT, and Nuclear Medicine Technologist at Mercy. Currently a premed student at Washington University in St. Louis, studying for the MCAT and applying to medical school for the 2026-2027 cycle. The original BetterCram user.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-4">
              "I found that my most effective study habits vary depending on what I'm studying for. BetterCram adapts to how I need to learn."
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.linkedin.com/in/anna-mangiore/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <i className="fa-brands fa-linkedin" /> LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Built with */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Built with</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "Claude", desc: "AI card generation, tutoring, quizzes", icon: "fa-brain" },
              { name: "ElevenLabs", desc: "Nova voice tutor, Sage audio narrator", icon: "fa-microphone" },
              { name: "Firecrawl", desc: "Web search, scraping, site crawling", icon: "fa-fire" },
              { name: "React + Netlify", desc: "Frontend, serverless functions, hosting", icon: "fa-code" },
            ].map((tech) => (
              <div key={tech.name} className="text-center p-3">
                <i className={`fa-solid ${tech.icon} text-2xl text-indigo-500 mb-2 block`} />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{tech.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Community */}
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Join the community, report bugs, share decks, and help us make BetterCram better.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="https://www.reddit.com/r/BetterCram/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <i className="fa-brands fa-reddit-alien" />
              r/BetterCram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
