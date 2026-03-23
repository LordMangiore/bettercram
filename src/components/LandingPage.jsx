import { useState, useEffect, useRef } from "react";

function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

function DemoCard() {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setFlipped((f) => !f), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-72 sm:w-80 cursor-pointer mx-auto"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full h-48 transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/20"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-full">
                Biology
              </span>
              <span className="text-xs font-medium text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded-full">
                medium
              </span>
            </div>
            <p className="text-white font-medium leading-relaxed">
              What role does calcium play in skeletal muscle contraction?
            </p>
          </div>
          <p className="text-xs text-white/40 text-center">
            <i className="fa-solid fa-hand-pointer mr-1" /> Tap to flip
          </p>
        </div>
        <div
          className="absolute inset-0 bg-indigo-600/20 backdrop-blur-md rounded-2xl border border-indigo-400/30 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/20"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <span className="text-xs font-medium text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-full">
              Answer
            </span>
            <p className="text-white text-sm leading-relaxed mt-3">
              Calcium binds troponin, which moves tropomyosin to expose actin binding sites, allowing myosin cross-bridges to form and produce contraction.
            </p>
          </div>
          <p className="text-xs text-white/40 text-center">
            <i className="fa-solid fa-hand-pointer mr-1" /> Tap to flip
          </p>
        </div>
      </div>
    </div>
  );
}

function TypeWriter({ texts, speed = 50, pause = 2000 }) {
  const [text, setText] = useState("");
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIdx];
    let timeout;

    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => {
        setText(current.slice(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, speed);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setText(current.slice(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      }, speed / 2);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setTextIdx((textIdx + 1) % texts.length);
    }

    return () => clearTimeout(timeout);
  }, [charIdx, deleting, textIdx, texts, speed, pause]);

  return (
    <span>
      {text}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function LandingPage({ onLogin, dark, setDark }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div className={`min-h-screen overflow-hidden relative transition-colors ${dark ? "bg-gray-950 text-white" : "bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900"}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-spin"
          style={{
            background: dark
              ? "conic-gradient(from 0deg, transparent, rgba(99,102,241,0.08), transparent, rgba(139,92,246,0.08), transparent)"
              : "conic-gradient(from 0deg, transparent, rgba(99,102,241,0.04), transparent, rgba(139,92,246,0.04), transparent)",
            animationDuration: "20s",
          }}
        />
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${dark ? "bg-indigo-600/10" : "bg-indigo-400/10"}`} />
        <div
          className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${dark ? "bg-purple-600/10" : "bg-purple-400/10"}`}
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <h1 className={`text-xl font-bold flex items-center gap-2 ${dark ? "text-white" : "text-gray-900"}`}>
            <i className="fa-solid fa-bolt text-indigo-500" />
            BetterCram
          </h1>
          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className={`hidden sm:inline text-sm font-medium transition-colors ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
            >
              Pricing
            </a>
            <button
              onClick={() => setDark(!dark)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"}`}
            >
              <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} />
            </button>
            <button
              onClick={onLogin}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${dark ? "bg-white/10 border border-white/20 hover:bg-white/20" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            >
              <i className="fa-brands fa-google" />
              Sign in
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-12 sm:pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — text */}
            <div
              className={`space-y-6 transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium">
                <i className="fa-solid fa-wand-magic-sparkles" />
                Powered by Claude, ElevenLabs & Firecrawl
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Study smarter,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  <TypeWriter
                    texts={["not harder.", "with AI.", "your way.", "anywhere."]}
                  />
                </span>
              </h2>

              <p className={`text-lg max-w-lg ${dark ? "text-gray-400" : "text-gray-600"}`}>
                Turn any Google Doc into AI-powered flashcards with deep explanations,
                audio lessons, quizzes, and an AI tutor — all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onLogin}
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-lg font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <i className="fa-brands fa-google" />
                  Start Free Trial
                  <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                <i className="fa-solid fa-shield-check mr-1 text-green-500" />
                7-day free trial · No credit card required · Cancel anytime
              </p>

              {/* Stats */}
              <div className="flex gap-8 pt-4">
                <div>
                  <p className={`text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                    <AnimatedCounter target={817} />
                  </p>
                  <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Cards Ready</p>
                </div>
                <div>
                  <p className={`text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                    <AnimatedCounter target={7} duration={1000} />
                  </p>
                  <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Study Modes</p>
                </div>
                <div>
                  <p className={`text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                    <AnimatedCounter target={3} duration={800} />
                  </p>
                  <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>AI Engines</p>
                </div>
              </div>
            </div>

            {/* Right — demo card */}
            <div
              className={`transition-all duration-1000 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <DemoCard />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h3 className="text-center text-2xl font-bold mb-12">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              How it works
            </span>
          </h3>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: "fa-brands fa-google",
                title: "Sign in",
                desc: "One click with your Google account",
              },
              {
                step: "2",
                icon: "fa-solid fa-file-lines",
                title: "Load your doc",
                desc: "Paste a Google Doc URL or use our default study set",
              },
              {
                step: "3",
                icon: "fa-solid fa-rocket",
                title: "Study 6 ways",
                desc: "Flash cards, quizzes, AI tutor, audio, research, mnemonics",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`relative rounded-2xl p-6 transition-all group ${dark ? "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200"}`}
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-600/30">
                  {item.step}
                </div>
                <i className={`${item.icon} text-3xl text-indigo-400 mb-4 block group-hover:scale-110 transition-transform`} />
                <h4 className="font-semibold text-lg mb-1">{item.title}</h4>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h3 className="text-center text-2xl font-bold mb-12">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              Everything you need to study smarter
            </span>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "fa-clone", label: "Flip Cards", desc: "Swipe, shuffle, keyboard nav — study at your pace", color: "text-blue-500" },
              { icon: "fa-graduation-cap", label: "AI Tutor", desc: "Claude explains any concept in depth, on demand", color: "text-purple-500", pro: true },
              { icon: "fa-circle-question", label: "Smart Quizzes", desc: "Auto-generated MCQs with explanations", color: "text-green-500" },
              { icon: "fa-microscope", label: "Deep Dive Research", desc: "Firecrawl searches the web, Claude synthesizes", color: "text-orange-500", pro: true },
              { icon: "fa-headphones", label: "Audio Study", desc: "Podcast-style lessons narrated by ElevenLabs", color: "text-pink-500", pro: true },
              { icon: "fa-headset", label: "Voice Tutor", desc: "Real-time voice conversation with an AI study partner", color: "text-cyan-500", pro: true },
            ].map((f) => (
              <div
                key={f.label}
                className={`relative rounded-2xl p-5 hover:scale-[1.02] transition-all group ${dark ? "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200"}`}
              >
                {f.pro && (
                  <span className="absolute top-3 right-3 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider">
                    Pro
                  </span>
                )}
                <i className={`fa-solid ${f.icon} text-2xl ${f.color} mb-3 block group-hover:scale-110 transition-transform`} />
                <h4 className="font-semibold mb-1">{f.label}</h4>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-6xl mx-auto px-6 py-16" id="pricing">
          <h3 className="text-center text-2xl font-bold mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              Simple, transparent pricing
            </span>
          </h3>
          <p className={`text-center mb-12 ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Start with a 7-day free trial. Cancel anytime.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Starter */}
            <div className={`rounded-2xl p-6 flex flex-col ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}>
              <h4 className={`text-xl font-bold mb-1 ${dark ? "" : "text-gray-900"}`}>Starter</h4>
              <div className="mb-4">
                <span className={`text-4xl font-bold ${dark ? "" : "text-gray-900"}`}>$9</span>
                <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>/month</span>
              </div>
              <ul className={`space-y-2 flex-1 mb-6 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Flip cards & study mode</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />AI-generated quizzes</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Spaced repetition</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Search & filter</li>
                <li className={dark ? "text-gray-500" : "text-gray-400"}><i className="fa-solid fa-xmark text-gray-300 dark:text-gray-600 mr-2" />AI Tutor</li>
                <li className={dark ? "text-gray-500" : "text-gray-400"}><i className="fa-solid fa-xmark text-gray-300 dark:text-gray-600 mr-2" />Voice Tutor</li>
                <li className={dark ? "text-gray-500" : "text-gray-400"}><i className="fa-solid fa-xmark text-gray-300 dark:text-gray-600 mr-2" />Audio & Research</li>
              </ul>
              <button
                onClick={onLogin}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
              >
                Start Free Trial
              </button>
            </div>

            {/* Pro Monthly — Popular */}
            <div className="relative rounded-2xl p-6 flex flex-col bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02] border-2 border-indigo-400">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
              <h4 className="text-xl font-bold mb-1">Pro</h4>
              <div className="mb-4">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-sm text-indigo-200">/month</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6 text-sm text-indigo-100">
                <li><i className="fa-solid fa-check text-indigo-300 mr-2" />Everything in Starter</li>
                <li><i className="fa-solid fa-check text-indigo-300 mr-2" />AI Tutor — deep explanations</li>
                <li><i className="fa-solid fa-check text-indigo-300 mr-2" />Voice Tutor — live conversation</li>
                <li><i className="fa-solid fa-check text-indigo-300 mr-2" />Audio study sessions</li>
                <li><i className="fa-solid fa-check text-indigo-300 mr-2" />Deep dive research</li>
                <li><i className="fa-solid fa-check text-indigo-300 mr-2" />Multiple doc library</li>
                <li><i className="fa-solid fa-check text-indigo-300 mr-2" />Study planner</li>
              </ul>
              <button
                onClick={onLogin}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-indigo-600 hover:bg-indigo-50 transition-all shadow-md"
              >
                Start Free Trial
              </button>
            </div>

            {/* Pro Yearly */}
            <div className={`relative rounded-2xl p-6 flex flex-col ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-400 text-green-900 text-xs font-bold rounded-full">
                SAVE $79/YR
              </div>
              <h4 className={`text-xl font-bold mb-1 ${dark ? "" : "text-gray-900"}`}>Pro Annual</h4>
              <div className="mb-4">
                <span className={`text-4xl font-bold ${dark ? "" : "text-gray-900"}`}>$149</span>
                <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>/year</span>
              </div>
              <ul className={`space-y-2 flex-1 mb-6 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Everything in Pro</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />2+ months free</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Lock in your rate</li>
              </ul>
              <button
                onClick={onLogin}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
              >
                Start Free Trial
              </button>
            </div>
          </div>
          <p className={`text-center text-sm mt-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            <i className="fa-solid fa-tag mr-1" />
            Have a coupon code? Apply it during checkout.
          </p>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h3 className={`text-3xl sm:text-4xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>
            Ready to ace your next exam?
          </h3>
          <p className={`mb-8 max-w-md mx-auto ${dark ? "text-gray-400" : "text-gray-600"}`}>
            7 study modes powered by 3 AI engines. Your flashcards are waiting.
          </p>
          <button
            onClick={onLogin}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-lg font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <i className="fa-brands fa-google" />
            Start Your Free Trial
            <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform" />
          </button>
        </section>

        {/* Footer */}
        <footer className={`border-t py-8 text-center text-sm ${dark ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400"}`}>
          <div className="flex items-center justify-center gap-6">
            <span>
              <i className="fa-solid fa-bolt text-indigo-500 mr-1" />
              BetterCram
            </span>
            <span>Built with Claude, ElevenLabs & Firecrawl</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
