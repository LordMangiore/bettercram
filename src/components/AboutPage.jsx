export default function AboutPage({ onBack, dark }) {
  return (
    <div className={`min-h-screen transition-colors ${dark ? "bg-gray-950 text-white" : "bg-white text-gray-900"}`}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        {onBack && (
          <button
            onClick={onBack}
            className={`mb-10 flex items-center gap-2 text-sm transition-colors ${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
          >
            <i className="fa-solid fa-arrow-left" />
            Back
          </button>
        )}

        {/* Header */}
        <div className="mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">About BetterCram</h2>
          <p className={`text-lg ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Two people. One app. Built because Anna needed it.
          </p>
        </div>

        {/* Origin story */}
        <div className="mb-16 space-y-5">
          <p className={`text-base leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
            Anna was studying for the MCAT while working full-time as a CT/Nuclear Medicine Technologist. She jokingly asked her husband Nicho if he could either do the dishes or build an app that auto-generates flashcards from her Google Docs.
          </p>
          <p className={`text-base leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
            24 hours later, BetterCram was live. With way more features than either of them expected.
          </p>
          <p className={`text-base leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
            We're not a company with funding or a team of 50. Just two people who saw a gap between "memorize this" and "actually understand it," and decided to build something better. The more people who use it, the better it gets. Community decks grow, audio caches speed up, and every piece of feedback shapes what comes next.
          </p>
        </div>

        {/* Team */}
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          <div className={`rounded-2xl p-6 border ${dark ? "bg-white/[0.03] border-white/10" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                N
              </div>
              <div>
                <h4 className="font-bold">Nicholas Mangiore</h4>
                <p className={`text-sm ${dark ? "text-indigo-400" : "text-indigo-600"}`}>Product & Engineering</p>
              </div>
            </div>
            <p className={`text-sm leading-relaxed mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Product Owner at CCA Global Partners. Previously led digital transformation at Mecum Auctions for 5 years. Certified ScrumMaster and Scrum Product Owner.
            </p>
            <p className={`text-xs italic mb-4 ${dark ? "text-gray-600" : "text-gray-400"}`}>
              "My wife asked me to build her an AI flashcard app. I said easy. Anything to not have to do dishes."
            </p>
            <a href="https://www.linkedin.com/in/nicholas-m-3a313a101/" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-xs ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}>
              <i className="fa-brands fa-linkedin" /> LinkedIn
            </a>
          </div>

          <div className={`rounded-2xl p-6 border ${dark ? "bg-white/[0.03] border-white/10" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                A
              </div>
              <div>
                <h4 className="font-bold">Anna Mangiore, BHSc</h4>
                <p className={`text-sm ${dark ? "text-pink-400" : "text-pink-600"}`}>The reason this exists</p>
              </div>
            </div>
            <p className={`text-sm leading-relaxed mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              X-Ray, CT, and Nuclear Medicine Technologist at Mercy. Premed at Washington University in St. Louis, studying for the MCAT. The original BetterCram user.
            </p>
            <p className={`text-xs italic mb-4 ${dark ? "text-gray-600" : "text-gray-400"}`}>
              "I found that my most effective study habits vary depending on what I'm studying for. BetterCram adapts to how I need to learn."
            </p>
            <a href="https://www.linkedin.com/in/anna-mangiore/" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-xs ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}>
              <i className="fa-brands fa-linkedin" /> LinkedIn
            </a>
          </div>
        </div>

        {/* Built with */}
        <div className="mb-16">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: dark ? "#6b7280" : "#9ca3af" }}>Built with</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { name: "Claude", desc: "Cards, tutoring, quizzes", icon: "fa-brain" },
              { name: "ElevenLabs", desc: "Nova and Sage voices", icon: "fa-microphone" },
              { name: "Firecrawl", desc: "Web scraping and search", icon: "fa-fire" },
              { name: "React + Netlify", desc: "App and infrastructure", icon: "fa-code" },
            ].map((tech) => (
              <div key={tech.name} className="text-center">
                <i className={`fa-solid ${tech.icon} text-xl text-indigo-500 mb-2 block`} />
                <p className={`text-sm font-semibold ${dark ? "" : "text-gray-900"}`}>{tech.name}</p>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Community */}
        <div className="text-center">
          <p className={`mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Join the community. Report bugs. Share decks. Help us make it better.
          </p>
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
  );
}
