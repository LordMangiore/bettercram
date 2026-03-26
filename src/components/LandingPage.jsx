import { useState, useEffect, useRef, useCallback } from "react";

function AudioPlayer({ src, label = "Nova", accent = "indigo" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef(null);

  const updateProgress = useCallback(() => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
    if (playing) animRef.current = requestAnimationFrame(updateProgress);
  }, [playing]);

  useEffect(() => {
    if (playing) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, updateProgress]);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function handleEnded() {
    setPlaying(false);
    setProgress(0);
  }

  const bars = 24;

  return (
    <div>
      <audio ref={audioRef} src={src} preload="auto" onEnded={handleEnded} />
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all hover:scale-105"
        >
          <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-white text-base ${!playing ? "ml-0.5" : ""}`} />
        </button>
        <div className="flex items-end gap-[3px] h-8 flex-1">
          {Array.from({ length: bars }).map((_, i) => {
            const barProgress = (i / bars) * 100;
            const active = barProgress < progress;
            const height = playing
              ? `${16 + Math.sin((Date.now() / 200) + i * 0.8) * 12 + Math.random() * 4}px`
              : `${10 + Math.sin(i * 0.6) * 6}px`;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-150 ${active ? "bg-white" : "bg-white/30"}`}
                style={{ height, transition: "height 0.15s ease, background-color 0.15s" }}
              />
            );
          })}
        </div>
      </div>
      <p className={`text-${accent}-300 text-xs mt-3`}>
        <i className="fa-solid fa-volume-high mr-1" />
        {playing ? `${label} is speaking...` : `Tap play to hear ${label}`}
      </p>
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

    const animate = () => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(from + eased * (target - from)));
        if (progress < 1) requestAnimationFrame(tick);
      };
      tick();
    };

    // If element is visible, animate immediately. Otherwise wait for intersection.
    if (!ref.current) { animate(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        animate();
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

const DEMO_CARDS = [
  { front: "Welcome to BetterCram! What makes this different from regular flashcards?", back: "BetterCram is a complete AI study platform with 7 modes: flip cards, spaced repetition, AI quizzes, an AI tutor, deep research, audio lessons, and Nova — your voice AI tutor.", category: "Getting Started" },
  { front: "How do you flip a flashcard?", back: "Tap or click the card to flip it. You can also press the spacebar! Use the left and right arrow keys to navigate between cards, or swipe on mobile.", category: "Getting Started" },
  { front: "What is Study mode and how does spaced repetition work?", back: "Study mode uses FSRS to track which cards you know. Rate each card Again, Hard, Good, or Easy. Cards you struggle with appear more often. Build streaks and watch your card glow hotter!", category: "Study Modes" },
  { front: "How do AI-generated quizzes work?", back: "Claude AI automatically generates multiple-choice questions from your flashcards. Each question has 4 options and a detailed explanation. Great for testing yourself before an exam!", category: "Study Modes" },
  { front: "What can the AI Tutor do?", back: "Three tools for any card: Explain for a deep breakdown, Mnemonic for a memory trick, and Ask to chat about anything related to the topic. Like a personal tutor 24/7.", category: "Study Modes" },
  { front: "Who is Nova?", back: "Nova is your AI voice tutor. Start talking and she'll quiz you, explain concepts, and use the Socratic method to help you learn. It's like studying with a smart friend.", category: "Nova" },
  { front: "What does the Audio tab do?", back: "Sage narrates podcast-style explanations of each card. Enable auto-play to go hands-free — perfect for studying while commuting, exercising, or relaxing.", category: "Study Modes" },
  { front: "What is Deep Dive Research?", back: "Firecrawl searches the web for authoritative sources about any topic. Claude synthesizes everything into a comprehensive explanation with real citations.", category: "Study Modes" },
  { front: "How do you add your own study material?", back: "Paste a Google Doc or Sheet URL and BetterCram scrapes the content and generates flashcards automatically using AI. Share the doc as Anyone with the link can view.", category: "Your Content" },
  { front: "What are Community Decks?", back: "Other students share their study decks. Browse Community to find decks for your subject. Subscribe to stay synced or Clone to make your own editable copy.", category: "Community" },
  { front: "Can you add your own custom cards?", back: "Yes! Go to Manage Cards to add new cards with a question, answer, and category. Great for adding concepts from lectures or textbooks.", category: "Your Content" },
  { front: "What is the Study Planner?", back: "Set your exam date, add milestones, and track daily and weekly goals. It works with your study progress to show you what needs attention.", category: "Study Modes" },
  { front: "How does the global audio cache work?", back: "When anyone plays audio for a card, it gets cached globally. The next person gets it instantly. The more people study, the faster the platform gets for everyone!", category: "Pro Tips" },
  { front: "What keyboard shortcuts are available?", back: "Spacebar: flip card. 1-4: rate card. Left/Right arrows: navigate. On mobile, swipe left or right.", category: "Pro Tips" },
  { front: "What's the difference between Regenerate and Add More cards?", back: "Regenerate replaces your current cards with a fresh set. Add More keeps existing cards and generates additional ones — great for expanding coverage without losing progress.", category: "Your Content" },
  { front: "Why does BetterCram use FSRS instead of simple flashcard review?", back: "FSRS is a next-gen spaced repetition algorithm, more accurate than SM-2 (what Anki uses). It calculates the optimal review moment based on your memory stability — study less, remember more.", category: "Study Modes" },
  { front: "Why are there two different AI voices?", back: "Nova is your conversational tutor — real-time voice, asks questions, adapts to your answers. Sage is your narrator — clear, consistent audio lessons. Different jobs, different voices.", category: "Nova" },
  { front: "Why does the card glow when you're on a streak?", back: "The heat glow rewards focus. Every 5 correct answers, the card gets hotter — from warm orange to white-hot. Gamification that makes studying feel less like a chore.", category: "Pro Tips" },
  { front: "Why is there a free tier?", back: "Core studying tools should be accessible to everyone. Flip cards, spaced repetition, and community decks are free forever. AI features cost us money to run — that's what paid tiers cover.", category: "Getting Started" },
  { front: "What happens to your progress if you cancel?", back: "Your cards, decks, and study progress stay in your account. You just lose access to AI features. Come back anytime and pick up where you left off.", category: "Getting Started" },
  { front: "You're ready to start studying! What should you do first?", back: "Browse Community to find a deck, create a New Deck from your own Google Doc, or start studying this deck using the different modes above!", category: "Getting Started" },
];

function DemoCard() {
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const card = DEMO_CARDS[cardIndex];

  useEffect(() => {
    const interval = setInterval(() => {
      setFlipped((f) => {
        if (f) {
          // Flipping back to front — change card on next tick
          setTimeout(() => setCardIndex((i) => (i + 1) % DEMO_CARDS.length), 350);
        }
        return !f;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-72 sm:w-80 cursor-pointer mx-auto"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full h-56 transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="absolute inset-0 bg-indigo-900 rounded-2xl border border-indigo-700 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/30"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-indigo-200 bg-indigo-500/30 px-2 py-1 rounded-full">
                {card.category}
              </span>
              <span className="text-xs font-medium text-green-200 bg-green-500/30 px-2 py-1 rounded-full">
                easy
              </span>
            </div>
            <p className="text-white font-medium leading-relaxed text-sm">
              {card.front}
            </p>
          </div>
          <p className="text-xs text-indigo-300/60 text-center">
            <i className="fa-solid fa-hand-pointer mr-1" /> Tap to flip
          </p>
        </div>
        <div
          className="absolute inset-0 bg-indigo-800 rounded-2xl border border-indigo-600 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/30 overflow-y-auto"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <span className="text-xs font-medium text-indigo-200 bg-indigo-500/30 px-2 py-1 rounded-full">
              Answer
            </span>
            <p className="text-white text-xs leading-relaxed mt-3">
              {card.back}
            </p>
          </div>
          <p className="text-xs text-indigo-300/60 text-center mt-2">
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

export default function LandingPage({ onLogin, dark, setDark, setPage }) {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState({ totalCards: 1058, totalDecks: 4 });

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    // Fetch real community stats
    fetch("/.netlify/functions/community-stats")
      .then(r => r.json())
      .then(data => {
        if (data.totalCards > 0) setStats(data);
      })
      .catch(() => {});
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

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Stop memorizing.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  <TypeWriter
                    texts={["Start learning.", "Talk to your notes.", "Get tested.", "Learn for real."]}
                  />
                </span>
              </h2>

              <p className={`text-lg max-w-lg ${dark ? "text-gray-400" : "text-gray-600"}`}>
                Turn any document into a complete AI study system — flashcards, voice tutor,
                audio lessons, quizzes, and deep research. Powered by Nova, your personal AI tutor.
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

              {/* Stats - hidden until numbers are impressive */}
            </div>

            {/* Right — demo card */}
            <div
              className={`transition-all duration-1000 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <DemoCard />
            </div>
          </div>
        </section>

        {/* Meet the voices */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h3 className="text-center text-2xl font-bold mb-10">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              Two voices, one goal: help you remember everything
            </span>
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Nova */}
            <div className={`rounded-3xl overflow-hidden ${dark ? "bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-800/50" : "bg-gradient-to-br from-indigo-600 to-purple-700"} p-8`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-medium mb-4">
                <i className="fa-solid fa-headset" /> Voice Tutor
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">Nova</h4>
              <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                Your conversational study buddy. She quizzes you, explains concepts, and uses the Socratic method — all in real-time voice.
              </p>
              <AudioPlayer src="/nova-demo.mp3" label="Nova" />
            </div>

            {/* Sage */}
            <div className={`rounded-3xl overflow-hidden ${dark ? "bg-gradient-to-br from-emerald-950 to-teal-950 border border-emerald-800/50" : "bg-gradient-to-br from-emerald-600 to-teal-700"} p-8`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-medium mb-4">
                <i className="fa-solid fa-headphones" /> Audio Lessons
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">Sage</h4>
              <p className="text-emerald-200 text-sm mb-6 leading-relaxed">
                Your podcast narrator. Sage turns any flashcard into a clear, conversational audio lesson — perfect for studying on the go.
              </p>
              <AudioPlayer src="/sage-demo.mp3" label="Sage" accent="emerald" />
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
                desc: "One click with your Google account — you're in",
              },
              {
                step: "2",
                icon: "fa-solid fa-wand-magic-sparkles",
                title: "Load your content",
                desc: "Paste a URL, search any topic, crawl an entire course site, or browse community decks",
              },
              {
                step: "3",
                icon: "fa-solid fa-rocket",
                title: "Study 7 ways",
                desc: "Flip cards, spaced repetition, quizzes, AI tutor, voice tutor, audio lessons, and deep dive research",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`relative rounded-2xl p-6 transition-all group ${dark ? "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200"}`}
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-600/30">
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
              { icon: "fa-brain", label: "Spaced Repetition", desc: "FSRS algorithm schedules reviews at the perfect moment — remember more, study less", color: "text-blue-500" },
              { icon: "fa-fire", label: "Streak & Heat Glow", desc: "Build streaks, watch your card glow hotter, and earn tiered confetti explosions", color: "text-orange-500" },
              { icon: "fa-headset", label: "Nova Voice Tutor", desc: "Talk to Nova — your AI tutor who knows your deck and quizzes you in real time", color: "text-cyan-500", pro: true },
              { icon: "fa-circle-question", label: "Smart Quizzes", desc: "Auto-generated multiple choice questions with detailed explanations", color: "text-green-500" },
              { icon: "fa-graduation-cap", label: "AI Tutor", desc: "Deep explanations, mnemonics, and follow-up chat on any card", color: "text-purple-500", pro: true },
              { icon: "fa-bell", label: "Study Reminders", desc: "Push notifications with Nova's personality — install as an app on any device", color: "text-yellow-500" },
              { icon: "fa-globe", label: "Community Decks", desc: "Browse and share study decks with other students — thousands of cards, zero effort", color: "text-emerald-500" },
              { icon: "fa-headphones", label: "Audio Lessons", desc: "Podcast-style study sessions with live script tracking — learn hands-free", color: "text-pink-500", pro: true },
              { icon: "fa-microscope", label: "Deep Dive Research", desc: "AI-powered deep dives into any topic — generates new cards as you explore", color: "text-indigo-500", pro: true },
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
            Study free forever. Upgrade when you want AI superpowers.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className={`rounded-2xl p-6 flex flex-col ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}>
              <h4 className={`text-xl font-bold mb-1 ${dark ? "" : "text-gray-900"}`}>Free</h4>
              <div className="mb-4">
                <span className={`text-4xl font-bold ${dark ? "" : "text-gray-900"}`}>Free</span>
              </div>
              <ul className={`space-y-2 flex-1 mb-6 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Flip cards & study mode</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Spaced repetition (FSRS)</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Create cards manually</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Streaks & heat glow</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Community decks</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Study planner</li>
              </ul>
              <button
                onClick={onLogin}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
              >
                Get Started
              </button>
            </div>

            {/* Starter — Popular */}
            <div className="relative rounded-2xl p-6 flex flex-col bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02] border-2 border-indigo-400">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
              <h4 className="text-xl font-bold mb-1">Starter</h4>
              <div className="mb-4">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-sm text-indigo-200">/month</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6 text-sm text-indigo-100">
                <li><i className="fa-solid fa-check text-green-400 mr-2" />Everything in Free</li>
                <li><i className="fa-solid fa-check text-green-400 mr-2" />AI-generated cards & quizzes</li>
                <li><i className="fa-solid fa-check text-green-400 mr-2" />AI Tutor — explanations & mnemonics</li>
                <li><i className="fa-solid fa-check text-green-400 mr-2" />Audio card narration</li>
                <li><i className="fa-solid fa-check text-green-400 mr-2" />Push notification reminders</li>
              </ul>
              <button
                onClick={onLogin}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-indigo-600 hover:bg-indigo-50 transition-all shadow-md"
              >
                Start 7-day free trial
              </button>
            </div>

            {/* Pro */}
            <div className={`rounded-2xl p-6 flex flex-col ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}>
              <h4 className={`text-xl font-bold mb-1 ${dark ? "" : "text-gray-900"}`}>Pro</h4>
              <div className="mb-4">
                <span className={`text-4xl font-bold ${dark ? "" : "text-gray-900"}`}>$19</span>
                <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>/month</span>
              </div>
              <ul className={`space-y-2 flex-1 mb-6 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Everything in Starter</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Nova — AI voice tutor</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Audio study sessions</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Deep dive research</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Unlimited doc library</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2" />Priority support</li>
              </ul>
              <button
                onClick={onLogin}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
              >
                Start 7-day free trial
              </button>
            </div>
          </div>
          <p className={`text-center text-sm mt-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
            <i className="fa-solid fa-calendar mr-1" />
            Pro Annual: <strong>$149/year</strong> — save $79 (4+ months free)
          </p>
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
            7 study modes. Nova, your AI voice tutor. Search any topic. Crawl any site. Free to start.
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

        {/* Our Story / Community */}
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className={`rounded-3xl p-8 sm:p-10 ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-heart text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-1 ${dark ? "" : "text-gray-900"}`}>Built by a couple who gets it</h3>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  BetterCram started when a premed student studying for the MCAT jokingly asked her husband to build an app that auto-generates flashcards from her Google Docs. 24 hours later, it was real — and way more than she imagined.
                </p>
              </div>
            </div>
            <p className={`text-sm leading-relaxed mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              We're not a big company. Just two people working full-time who believe students deserve better tools. The more people who use BetterCram, the better it gets — community decks grow, audio caches speed up, and every bug report makes it stronger.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.reddit.com/r/BetterCram/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <i className="fa-brands fa-reddit-alien" />
                Join r/BetterCram
              </a>
              <button
                onClick={() => setPage("contact")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                <i className="fa-solid fa-envelope" />
                Get in touch
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`border-t py-8 text-sm ${dark ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400"}`}>
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <span>
                <i className="fa-solid fa-bolt text-indigo-500 mr-1" />
                BetterCram
              </span>
              <span className="hidden sm:inline">Built with Claude, ElevenLabs &amp; Firecrawl</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://www.reddit.com/r/BetterCram/"
                target="_blank"
                rel="noopener noreferrer"
                className={`hover:underline transition-colors ${dark ? "hover:text-white" : "hover:text-gray-900"}`}
              >
                <i className="fa-brands fa-reddit-alien mr-1" />
                Reddit
              </a>
              <button
                onClick={() => setPage("about")}
                className={`hover:underline transition-colors ${dark ? "hover:text-white" : "hover:text-gray-900"}`}
              >
                About
              </button>
              <button
                onClick={() => setPage("privacy")}
                className={`hover:underline transition-colors ${dark ? "hover:text-white" : "hover:text-gray-900"}`}
              >
                Privacy
              </button>
              <button
                onClick={() => setPage("terms")}
                className={`hover:underline transition-colors ${dark ? "hover:text-white" : "hover:text-gray-900"}`}
              >
                Terms
              </button>
              <button
                onClick={() => setPage("contact")}
                className={`hover:underline transition-colors ${dark ? "hover:text-white" : "hover:text-gray-900"}`}
              >
                Contact
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
