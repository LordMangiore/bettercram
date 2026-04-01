import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// Reusable sub-components (from LandingPage.jsx)
// ============================================================

function AudioPlayer({ src, label = "Nova", accent = "indigo" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef(null);
  const updateProgress = useCallback(() => {
    if (audioRef.current && audioRef.current.duration) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    if (playing) animRef.current = requestAnimationFrame(updateProgress);
  }, [playing]);
  useEffect(() => { if (playing) animRef.current = requestAnimationFrame(updateProgress); return () => { if (animRef.current) cancelAnimationFrame(animRef.current); }; }, [playing, updateProgress]);
  function toggle() { if (!audioRef.current) return; if (playing) { audioRef.current.pause(); setPlaying(false); } else { audioRef.current.play(); setPlaying(true); } }
  const bars = 24;
  return (
    <div>
      <audio ref={audioRef} src={src} preload="auto" onEnded={() => { setPlaying(false); setProgress(0); }} />
      <div className="flex items-center gap-4">
        <button onClick={toggle} className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all hover:scale-105">
          <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-white text-base ${!playing ? "ml-0.5" : ""}`} />
        </button>
        <div className="flex items-end gap-[3px] h-8 flex-1">
          {Array.from({ length: bars }).map((_, i) => { const active = (i / bars) * 100 < progress; const height = playing ? `${16 + Math.sin((Date.now() / 200) + i * 0.8) * 12 + Math.random() * 4}px` : `${10 + Math.sin(i * 0.6) * 6}px`; return <div key={i} className={`w-[3px] rounded-full transition-colors duration-150 ${active ? "bg-white" : "bg-white/30"}`} style={{ height, transition: "height 0.15s ease, background-color 0.15s" }} />; })}
        </div>
      </div>
      <p className={`text-${accent}-300 text-xs mt-3`}><i className="fa-solid fa-volume-high mr-1" />{playing ? `${label} is speaking...` : `Tap play to hear ${label}`}</p>
    </div>
  );
}

function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (target === prevTarget.current) return;
    const from = prevTarget.current;
    prevTarget.current = target;
    const animate = () => { const start = Date.now(); const tick = () => { const elapsed = Date.now() - start; const p = Math.min(elapsed / duration, 1); setCount(Math.floor(from + (1 - Math.pow(1 - p, 3)) * (target - from))); if (p < 1) requestAnimationFrame(tick); }; tick(); };
    if (!ref.current) { animate(); return; }
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) { observer.disconnect(); animate(); } });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{count.toLocaleString()}</span>;
}

const DEMO_CARDS = [
  { front: "What makes BetterCram different from regular flashcards?", back: "7 study modes: flip cards, spaced repetition, AI quizzes, AI tutor, deep research, audio lessons, and Nova voice tutor.", category: "Getting Started" },
  { front: "How does spaced repetition work?", back: "FSRS tracks which cards you know. Rate each card and it calculates the optimal review moment. Study less, remember more.", category: "Study" },
  { front: "How do AI-generated quizzes work?", back: "Claude AI generates multiple-choice questions from your cards, focusing on your weakest areas. Detailed explanations for every answer.", category: "Test" },
  { front: "Who is Nova?", back: "Your AI voice tutor. She searches your actual deck mid-conversation, quizzes you from real cards, and adapts her style to how you're doing.", category: "Nova" },
  { front: "What does Sage do?", back: "Podcast-style audio for every card. Enable auto-play to study hands-free while commuting, exercising, or relaxing.", category: "Sage" },
  { front: "How do you add study material?", back: "Paste a URL, upload a PDF, import Anki decks, or photograph your handwritten notes. Textbooks get auto-tagged by chapter.", category: "Import" },
];

function DemoCard() {
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const card = DEMO_CARDS[cardIndex];
  useEffect(() => { const interval = setInterval(() => { setFlipped(f => { if (f) setTimeout(() => setCardIndex(i => (i + 1) % DEMO_CARDS.length), 350); return !f; }); }, 3500); return () => clearInterval(interval); }, []);
  return (
    <div className="w-full max-w-72 sm:max-w-80 cursor-pointer mx-auto" style={{ perspective: "1000px" }} onClick={() => setFlipped(!flipped)}>
      <div className="relative w-full h-56 transition-transform duration-700" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <div className="absolute inset-0 bg-indigo-900 rounded-2xl border border-indigo-700 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/30" style={{ backfaceVisibility: "hidden" }}>
          <div>
            <span className="text-xs font-medium text-indigo-200 bg-indigo-500/30 px-2 py-1 rounded-full">{card.category}</span>
            <p className="text-white font-medium leading-relaxed text-sm mt-3">{card.front}</p>
          </div>
          <p className="text-xs text-indigo-300/60 text-center"><i className="fa-solid fa-hand-pointer mr-1" /> Tap to flip</p>
        </div>
        <div className="absolute inset-0 bg-indigo-800 rounded-2xl border border-indigo-600 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/30 overflow-y-auto" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <div>
            <span className="text-xs font-medium text-indigo-200 bg-indigo-500/30 px-2 py-1 rounded-full">Answer</span>
            <p className="text-white text-xs leading-relaxed mt-3">{card.back}</p>
          </div>
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
    if (!deleting && charIdx < current.length) { timeout = setTimeout(() => { setText(current.slice(0, charIdx + 1)); setCharIdx(charIdx + 1); }, speed); }
    else if (!deleting && charIdx === current.length) { timeout = setTimeout(() => setDeleting(true), pause); }
    else if (deleting && charIdx > 0) { timeout = setTimeout(() => { setText(current.slice(0, charIdx - 1)); setCharIdx(charIdx - 1); }, speed / 2); }
    else if (deleting && charIdx === 0) { setDeleting(false); setTextIdx((textIdx + 1) % texts.length); }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, textIdx, texts, speed, pause]);
  return <span>{text}<span className="animate-pulse">|</span></span>;
}

function OTPLogin({ sendOTP, verifyOTP, otpStep, otpEmail, otpError, setOtpStep, dark }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const codeInputRef = useRef(null);
  useEffect(() => { if (otpStep === "code" && codeInputRef.current) codeInputRef.current.focus(); }, [otpStep]);

  if (otpStep === "code" || otpStep === "verifying") {
    return (
      <div className="space-y-4 max-w-sm">
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Code sent to <strong className="break-all">{otpEmail}</strong></p>
        <input ref={codeInputRef} type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && code.length === 6 && verifyOTP(code)} className={`w-full px-4 py-3 rounded-xl text-center text-2xl font-bold tracking-[0.3em] border ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-200 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
        <button onClick={() => verifyOTP(code)} disabled={code.length !== 6 || otpStep === "verifying"} className="w-full py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {otpStep === "verifying" ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Verifying...</> : "Verify & Sign In"}
        </button>
        {otpError && <p className="text-red-400 text-sm text-center">{otpError}</p>}
        <button onClick={() => { setOtpStep("email"); setCode(""); }} className={`w-full text-sm ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>Use a different email</button>
      </div>
    );
  }
  return (
    <div className="space-y-3 max-w-sm">
      <div className="flex gap-2">
        <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && email.includes("@") && sendOTP(email)} className={`flex-1 min-w-0 px-4 py-3 rounded-xl border ${dark ? "bg-white/10 border-white/20 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
        <button onClick={() => sendOTP(email)} disabled={!email.includes("@") || otpStep === "sending"} className="px-5 py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0">
          {otpStep === "sending" ? <i className="fa-solid fa-spinner fa-spin" /> : "Send Code"}
        </button>
      </div>
      {otpError && <p className="text-red-400 text-sm">{otpError}</p>}
    </div>
  );
}

// ============================================================
// New V2 components
// ============================================================

function FadeInSection({ children, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}>{children}</div>;
}

function AppStoreBadges({ small }) {
  const h = small ? "h-9" : "h-11";
  return (
    <div className="flex gap-3">
      <a href="#" className={`${h} px-4 bg-black rounded-lg flex items-center gap-2 border border-white/20 hover:bg-gray-900 transition-colors`}>
        <i className="fa-brands fa-apple text-white text-lg" />
        <div className="text-left leading-tight">
          <div className="text-[8px] text-gray-400">Download on the</div>
          <div className="text-xs text-white font-semibold -mt-0.5">App Store</div>
        </div>
      </a>
      <a href="#" className={`${h} px-4 bg-black rounded-lg flex items-center gap-2 border border-white/20 hover:bg-gray-900 transition-colors`}>
        <i className="fa-brands fa-google-play text-white text-lg" />
        <div className="text-left leading-tight">
          <div className="text-[8px] text-gray-400">Get it on</div>
          <div className="text-xs text-white font-semibold -mt-0.5">Google Play</div>
        </div>
      </a>
    </div>
  );
}

// ============================================================
// Main Landing Page V2
// ============================================================

export default function LandingPageV2({ dark, setDark, setPage, otpStep, otpEmail, otpError, sendOTP, verifyOTP, setOtpStep }) {
  const [stats, setStats] = useState({ totalCards: 1058, totalDecks: 4 });
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    fetch("/.netlify/functions/community-stats").then(r => r.json()).then(data => { if (data.totalCards > 0) setStats(data); }).catch(() => {});
  }, []);

  const EXAM_BADGES = ["MCAT", "NCLEX", "AP Biology", "Organic Chemistry", "Step 1", "Pharmacology", "Biochemistry", "Anatomy"];

  const FEATURES = [
    { icon: "fa-book-open", title: "Study", desc: "Powered by FSRS, the next-gen spaced repetition algorithm that replaced what Anki uses. It figures out exactly when you're about to forget something and puts it back in front of you. Cards you struggle with show up more. Cards you nail fade back. Hit a streak and watch your card start glowing.", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: "fa-brain", title: "Test", desc: "Claude reads your cards and writes real exam-style questions. Not just the flashcard flipped around. It goes after your weak spots first, and the question bank keeps growing every time you study.", color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: "fa-podcast", title: "Sage", desc: "Every card gets a podcast-style audio lesson. Hit play and study while you commute, cook, or pretend to clean your apartment. Auto-play chains them together so you don't have to touch anything.", color: "text-emerald-500", bg: "bg-emerald-500/10", pro: true },
    { icon: "fa-comments", title: "Nova", desc: "A voice tutor who actually knows your deck. She searches your cards mid-conversation, quizzes you from real material, and adapts to how you're doing. Come in frustrated and she meets you there. Start crushing it and she stops holding back.", color: "text-pink-500", bg: "bg-pink-500/10", pro: true },
    { icon: "fa-camera", title: "Import Anything", desc: "Paste a URL, upload a PDF, import from Anki, or just photograph your handwritten notes. AI reads everything and builds your deck. Textbooks get auto-tagged by chapter so you can study one section at a time.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { icon: "fa-user-group", title: "Collaborate", desc: "Invite friends to build a deck together. Real co-editing, not just sharing a copy. Share an invite link and your whole study group is in. Everyone studies from the same cards, and everyone can add to them.", color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const STEPS = [
    { icon: "fa-link", title: "Clean extraction", desc: "Firecrawl scrapes your source, removes ads and junk" },
    { icon: "fa-wand-magic-sparkles", title: "Card generation", desc: "Claude decides what's worth studying" },
    { icon: "fa-filter", title: "Quality scoring", desc: "Duplicates removed, vague questions rewritten" },
    { icon: "fa-layer-group", title: "Seven outputs", desc: "Each card feeds: quizzes, audio, research, tutoring" },
    { icon: "fa-bolt", title: "Cache & share", desc: "First user pays the cost, rest get it instantly" },
  ];

  return (
    <div className={`min-h-screen transition-colors ${dark ? "bg-gray-950 text-white" : "bg-white text-gray-900"}`}>

      {/* ===== STICKY NAV ===== */}
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b ${dark ? "bg-gray-950/80 border-white/5" : "bg-white/80 border-gray-200/50"}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-bolt text-indigo-500" />
            BetterCram
          </h1>
          <div className="flex items-center gap-3">
            <a href="#features" className={`hidden sm:inline text-sm font-medium transition-colors ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>Features</a>
            <a href="#pricing" className={`hidden sm:inline text-sm font-medium transition-colors ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>Pricing</a>
            <button onClick={() => setDark(!dark)} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}>
              <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} />
            </button>
            <button onClick={() => document.getElementById("hero-login")?.scrollIntoView({ behavior: "smooth" })} className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all">
              Sign in
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
              Learn it. Then
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 inline-block min-h-[1.2em]">
                <TypeWriter texts={["remember it.", "lock it in.", "own it.", "keep it."]} />
              </span>
            </h2>

            <p className={`text-lg md:text-xl max-w-lg leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>
              Most study apps make you memorize. BetterCram makes you understand first, then uses spaced repetition, voice tutoring, and AI quizzes to make sure it sticks.
            </p>

            <div id="hero-login" className="space-y-4 scroll-mt-24">
              <OTPLogin sendOTP={sendOTP} verifyOTP={verifyOTP} otpStep={otpStep} otpEmail={otpEmail} otpError={otpError} setOtpStep={setOtpStep} dark={dark} />
              <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                <i className="fa-solid fa-shield-check mr-1 text-green-500" />
                Free to start. No credit card required.
              </p>
              <AppStoreBadges />
            </div>
          </div>

          <div className="hidden lg:block">
            <DemoCard />
          </div>
        </div>
      </section>


      {/* ===== HOW IT WORKS ===== */}
      <FadeInSection>
        <section className="max-w-4xl mx-auto px-6 py-20">
          <h3 className={`text-center text-3xl sm:text-4xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>Three steps. That's it.</h3>
          <p className={`text-center mb-12 max-w-lg mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>No setup wizards. No configuration. Give it your material and start studying.</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { num: "1", icon: "fa-cloud-arrow-up", title: "Add your material", desc: "Paste a URL, upload a PDF, import from Anki, or photograph your handwritten notes." },
              { num: "2", icon: "fa-wand-magic-sparkles", title: "AI builds your deck", desc: "Cards tagged by chapter, quizzes, audio lessons, and tutor context — generated automatically." },
              { num: "3", icon: "fa-headphones", title: "Study your way", desc: "Spaced repetition, quizzes, podcasts, or voice tutoring. Pick any mode. Invite your study group." },
            ].map(step => (
              <div key={step.num} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-xl">
                  <i className={`fa-solid ${step.icon}`} />
                </div>
                <h4 className={`font-semibold mb-2 ${dark ? "" : "text-gray-900"}`}>{step.title}</h4>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeInSection>

      {/* ===== MEET THE VOICES ===== */}
      <FadeInSection>
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h3 className={`text-center text-3xl sm:text-4xl font-bold mb-12 ${dark ? "" : "text-gray-900"}`}>Meet the voices</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-indigo-950 to-purple-950 rounded-2xl p-8 border border-indigo-800/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-white">Nova</span>
                <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">Voice Tutor</span>
              </div>
              <p className="text-indigo-200 text-sm mb-6">Before Nova says a word, she already knows what you've been getting wrong, how long you've been at it, and whether this topic is new or familiar. Come in frustrated and she meets you where you are. Start crushing it and she stops holding back.</p>
              <AudioPlayer src="/nova-demo-real.mp3" label="Nova" accent="indigo" />
            </div>
            <div className="bg-gradient-to-br from-emerald-950 to-teal-950 rounded-2xl p-8 border border-emerald-800/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-white">Sage</span>
                <span className="text-xs text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">Audio Lessons</span>
              </div>
              <p className="text-emerald-200 text-sm mb-6">Your podcast narrator. Clear, conversational audio for every card. Perfect for studying on the go.</p>
              <AudioPlayer src="/sage-demo.mp3" label="Sage" accent="emerald" />
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ===== SEE IT IN ACTION ===== */}
      <FadeInSection>
        <section className={`py-16 ${dark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
          <div className="max-w-5xl mx-auto px-6">
            <h3 className={`text-center text-3xl sm:text-4xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>See it in action</h3>
            <p className={`text-center mb-10 max-w-lg mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>We gave BetterCram the full text of Crime and Punishment. It generated 2,051 study cards with audio lessons for every single one.</p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {[
                { q: "What does Marmeladov's 'Behold the man!' reference reveal?", diff: "hard", color: "text-red-500", audio: "/cp-card3.mp3" },
                { q: "What philosophical distinction does Marmeladov make between poverty and beggary?", diff: "medium", color: "text-yellow-500", audio: "/cp-card4.mp3" },
              ].map((card, i) => (
                <div key={i} className={`rounded-xl p-5 border ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase ${card.color}`}>{card.diff}</span>
                    <span className={`text-[10px] ${dark ? "text-gray-600" : "text-gray-300"}`}>Card {i + 1}</span>
                  </div>
                  <p className={`text-sm leading-relaxed mb-4 ${dark ? "text-gray-300" : "text-gray-700"}`}>{card.q}</p>
                  <AudioPlayer src={card.audio} label="Sage" accent="emerald" />
                </div>
              ))}
            </div>
            <p className={`text-center text-sm mt-8 ${dark ? "text-gray-500" : "text-gray-400"}`}>One novel. 2,051 cards. Every card has a podcast lesson. All generated automatically.</p>
          </div>
        </section>
      </FadeInSection>

      {/* ===== FEATURES ===== */}
      <FadeInSection>
        <section id="features" className="max-w-5xl mx-auto px-6 py-16">
          <h3 className={`text-center text-3xl sm:text-4xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>Learn it six different ways. Remember it forever.</h3>
          <p className={`text-center mb-12 max-w-lg mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>Every feature exists because a premed student needed it. Half help you understand. Half make sure you never forget.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className={`p-6 rounded-2xl border transition-all hover:scale-[1.01] ${dark ? "bg-white/[0.03] border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"}`}>
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <i className={`fa-solid ${f.icon} ${f.color}`} />
                </div>
                <h4 className={`font-semibold mb-1 flex items-center gap-2 ${dark ? "" : "text-gray-900"}`}>
                  {f.title}
                  {f.pro && <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">PRO</span>}
                </h4>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeInSection>

      {/* ===== KNOWLEDGE REFINERY ===== */}
      <FadeInSection>
        <section className={`py-16 ${dark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
          <div className="max-w-5xl mx-auto px-6">
            <h3 className={`text-center text-3xl sm:text-4xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>Built different. Not AI slop.</h3>
            <p className={`text-center mb-12 max-w-lg mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>Five stages between your source material and your study deck. Every step filters noise and amplifies signal.</p>
            <div className="grid sm:grid-cols-5 gap-4">
              {STEPS.map((s, i) => (
                <div key={i} className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${dark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-100 text-indigo-600"}`}>
                    <i className={`fa-solid ${s.icon}`} />
                  </div>
                  <h4 className={`text-sm font-semibold mb-1 ${dark ? "" : "text-gray-900"}`}>{s.title}</h4>
                  <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ===== PRICING ===== */}
      <FadeInSection>
        <section id="pricing" className="max-w-4xl mx-auto px-6 py-20">
          <h3 className={`text-center text-3xl sm:text-4xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>Two plans. Zero surprises.</h3>
          <p className={`text-center mb-8 max-w-md mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>Core study tools are free forever. Upgrade for AI-powered everything.</p>

          {/* Toggle */}
          <div className="flex justify-center mb-10">
            <div className={`inline-flex items-center rounded-full p-1 ${dark ? "bg-white/10" : "bg-gray-100"}`}>
              <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!annual ? "bg-indigo-600 text-white shadow-sm" : dark ? "text-gray-400" : "text-gray-500"}`}>Monthly</button>
              <button onClick={() => setAnnual(true)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${annual ? "bg-indigo-600 text-white shadow-sm" : dark ? "text-gray-400" : "text-gray-500"}`}>Annual <span className="text-green-400 text-xs ml-1">Save 25%</span></button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className={`rounded-2xl p-6 flex flex-col border ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
              <h4 className={`text-xl font-bold mb-1 ${dark ? "" : "text-gray-900"}`}>Free</h4>
              <div className="mb-6">
                <span className={`text-4xl font-bold ${dark ? "" : "text-gray-900"}`}>$0</span>
                <span className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}> forever</span>
              </div>
              <ul className={`space-y-2.5 flex-1 mb-6 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                {["Flip cards & study mode", "FSRS spaced repetition", "Create cards manually", "Streaks & heat glow", "Community decks", "Study planner", "Push notifications"].map(f => (
                  <li key={f}><i className="fa-solid fa-check text-green-500 mr-2" />{f}</li>
                ))}
              </ul>
              <button onClick={() => document.getElementById("hero-login")?.scrollIntoView({ behavior: "smooth" })} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl p-6 flex flex-col bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl shadow-indigo-600/20 border-2 border-indigo-400/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">RECOMMENDED</div>
              <h4 className="text-xl font-bold mb-1">Pro</h4>
              <div className="mb-6">
                <span className="text-4xl font-bold">{annual ? "$9" : "$12"}</span>
                <span className="text-sm text-indigo-200">{annual ? "/mo billed annually ($108)" : "/month"}</span>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6 text-sm text-indigo-100">
                {["Everything in Free", "AI cards from any URL", "AI-generated quizzes", "AI Tutor & chat", "Sage audio lessons", "Nova voice tutor", "Deep dive research", "Unlimited documents", "Priority support"].map(f => (
                  <li key={f}><i className="fa-solid fa-check text-green-400 mr-2" />{f}</li>
                ))}
              </ul>
              <button onClick={() => document.getElementById("hero-login")?.scrollIntoView({ behavior: "smooth" })} className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-indigo-600 hover:bg-indigo-50 transition-all shadow-md">
                Start 30-day free trial
              </button>
            </div>
          </div>
          <p className={`text-center text-sm mt-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            <i className="fa-solid fa-tag mr-1" /> Have a coupon? Apply it during checkout.
          </p>
        </section>
      </FadeInSection>

      {/* ===== BOTTOM CTA ===== */}
      <FadeInSection>
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h3 className={`text-3xl sm:text-4xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>Start studying in 30 seconds.</h3>
          <p className={`mb-8 max-w-md mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>Sign in, paste a link, and let BetterCram handle the rest.</p>
          <button onClick={() => document.getElementById("hero-login")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-lg font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
            Get Started Free
            <i className="fa-solid fa-arrow-right" />
          </button>
        </section>
      </FadeInSection>

      {/* ===== ABOUT ===== */}
      <FadeInSection>
        <section className={`py-16 ${dark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h3 className={`text-2xl font-bold mb-4 ${dark ? "" : "text-gray-900"}`}>Built by a couple who gets it</h3>
            <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              A premed student jokingly asked her husband to build an app that auto-generates flashcards. 24 hours later, it was real. Two people, working full-time, building better study tools.
            </p>
            <div className="flex justify-center gap-8">
              <div>
                <p className={`font-semibold text-sm ${dark ? "" : "text-gray-900"}`}>Nicholas Mangiore</p>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Product & Engineering</p>
              </div>
              <div>
                <p className={`font-semibold text-sm ${dark ? "" : "text-gray-900"}`}>Anna Mangiore</p>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>MCAT Student & QA</p>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ===== FOOTER ===== */}
      <footer className={`border-t py-10 ${dark ? "border-white/5" : "border-gray-200"}`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <i className="fa-solid fa-bolt text-indigo-500" /> BetterCram
            </h2>
            <p className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>Built by students, for students. Powered by Claude, ElevenLabs & Firecrawl.</p>
            <AppStoreBadges small />
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="https://reddit.com/r/BetterCram" target="_blank" rel="noopener" className={`${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"} transition-colors`}>Reddit</a>
            <button onClick={() => setPage("about")} className={`${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"} transition-colors`}>About</button>
            <button onClick={() => setPage("privacy")} className={`${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"} transition-colors`}>Privacy</button>
            <button onClick={() => setPage("terms")} className={`${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"} transition-colors`}>Terms</button>
            <button onClick={() => setPage("contact")} className={`${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"} transition-colors`}>Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
