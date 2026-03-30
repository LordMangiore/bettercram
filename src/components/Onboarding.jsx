import { useState, useEffect, useRef } from "react";
import { browsePublicDecks, subscribeToDeck } from "../api";

const SUBJECT_OPTIONS = [
  { id: "mcat", label: "MCAT", icon: "fa-solid fa-stethoscope" },
  { id: "nclex", label: "NCLEX", icon: "fa-solid fa-heart-pulse" },
  { id: "ap-bio", label: "AP Biology", icon: "fa-solid fa-dna" },
  { id: "ap-chem", label: "AP Chemistry", icon: "fa-solid fa-flask" },
  { id: "orgo", label: "Organic Chemistry", icon: "fa-solid fa-atom" },
  { id: "biochem", label: "Biochemistry", icon: "fa-solid fa-vial" },
  { id: "anatomy", label: "Anatomy & Physiology", icon: "fa-solid fa-bone" },
  { id: "literature", label: "Literature", icon: "fa-solid fa-book" },
  { id: "nursing", label: "Nursing", icon: "fa-solid fa-user-nurse" },
  { id: "premed", label: "Pre-Med", icon: "fa-solid fa-user-doctor" },
  { id: "gen-science", label: "General Science", icon: "fa-solid fa-microscope" },
  { id: "other", label: "Other", icon: "fa-solid fa-ellipsis" },
];

const FAMILIARITY_OPTIONS = [
  { id: "brand-new", label: "Brand new to me", icon: "fa-solid fa-seedling" },
  { id: "seen-before", label: "Seen it before but don't remember much", icon: "fa-solid fa-cloud" },
  { id: "know-basics", label: "I know the basics, need to go deeper", icon: "fa-solid fa-layer-group" },
  { id: "reviewing", label: "Reviewing for an exam \u2014 I've studied this before", icon: "fa-solid fa-rotate" },
];

const STUDY_STYLE_OPTIONS = [
  { id: "encouragement", label: "I panic a little and need encouragement", icon: "fa-solid fa-hand-holding-heart" },
  { id: "grind", label: "I grind through it \u2014 just keep going", icon: "fa-solid fa-fire" },
  { id: "understand-why", label: "I need to understand WHY before I can memorize", icon: "fa-solid fa-lightbulb" },
  { id: "quiz-me", label: "I do better when someone quizzes me", icon: "fa-solid fa-circle-question" },
];

const STUDY_CONTEXT_OPTIONS = [
  { id: "student-time", label: "Student with plenty of time", icon: "fa-solid fa-graduation-cap" },
  { id: "student-work", label: "Student juggling work and school", icon: "fa-solid fa-briefcase" },
  { id: "professional", label: "Working professional studying on the side", icon: "fa-solid fa-laptop" },
  { id: "cramming", label: "Cramming \u2014 exam is soon", icon: "fa-solid fa-clock" },
];

const TOTAL_STEPS = 5;

function generateUsername(email) {
  const prefix = (email || "student").split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return prefix + digits;
}

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-indigo-500"
              : i < current
              ? "w-2 bg-indigo-400"
              : "w-2 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

function RadioOption({ option, selected, onSelect }) {
  const isSelected = selected === option.id;
  return (
    <button
      onClick={() => onSelect(option.id)}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
        isSelected
          ? "bg-indigo-600/20 border-indigo-500 text-white"
          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <i className={`${option.icon} w-5 text-center ${isSelected ? "text-indigo-400" : "text-gray-500"}`} />
      <span className="text-sm font-medium">{option.label}</span>
      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        isSelected ? "border-indigo-500 bg-indigo-500" : "border-white/20"
      }`}>
        {isSelected && <i className="fa-solid fa-check text-[10px] text-white" />}
      </div>
    </button>
  );
}

// Step 1: Welcome
function StepWelcome({ name, setName, username, setUsername, onNext }) {
  const [editingName, setEditingName] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (editingName && nameRef.current) nameRef.current.focus();
  }, [editingName]);

  return (
    <div className="text-center space-y-6">
      <div className="space-y-3">
        <i className="fa-solid fa-bolt text-5xl text-indigo-400 animate-pulse" />
        <h1 className="text-3xl font-bold text-white">Welcome to BetterCram!</h1>
        <p className="text-gray-400">Let's get you set up in under a minute.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 text-left">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Your Name</label>
            {!editingName && (
              <button onClick={() => setEditingName(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                Edit
              </button>
            )}
          </div>
          {editingName ? (
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-xl font-semibold text-white">{name || "Student"}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">That's you, right?</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">Username</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Auto-generated. Change it if you like.</p>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!name.trim()}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors"
      >
        Next
      </button>
    </div>
  );
}

// Step 2: Subjects
function StepSubjects({ subjects, setSubjects, onNext, onBack }) {
  function toggleSubject(id) {
    setSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">What are you studying?</h2>
        <p className="text-gray-400 text-sm">Pick all that apply. This helps us personalize your experience.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {SUBJECT_OPTIONS.map((opt) => {
          const selected = subjects.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleSubject(opt.id)}
              className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2.5 ${
                selected
                  ? "bg-indigo-600/20 border-indigo-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <i className={`${opt.icon} w-4 text-center ${selected ? "text-indigo-400" : "text-gray-500"}`} />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={subjects.length === 0}
          className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Step 3: Community decks
function StepDecks({ subjects, selectedDecks, setSelectedDecks, onNext, onBack }) {
  const [communityDecks, setCommunityDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingDecks(true);
    browsePublicDecks()
      .then(({ decks }) => {
        if (cancelled) return;
        // Map subject ids to keywords for matching
        const keywords = subjects.flatMap((s) => {
          const opt = SUBJECT_OPTIONS.find((o) => o.id === s);
          return opt ? opt.label.toLowerCase().split(/\s+/) : [s];
        });

        // Sort: decks matching user subjects first
        const scored = decks.map((d) => {
          const cats = (d.categories || []).map((c) => c.toLowerCase());
          const nameWords = (d.name || "").toLowerCase();
          const matchScore = keywords.reduce((acc, kw) => {
            if (cats.some((c) => c.includes(kw)) || nameWords.includes(kw)) return acc + 1;
            return acc;
          }, 0);
          return { ...d, matchScore };
        });
        scored.sort((a, b) => b.matchScore - a.matchScore || (b.copies + b.upvotes) - (a.copies + a.upvotes));
        setCommunityDecks(scored.slice(0, 12));
        setLoadingDecks(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingDecks(false);
      });
    return () => { cancelled = true; };
  }, [subjects]);

  function toggleDeck(deckId) {
    setSelectedDecks((prev) =>
      prev.includes(deckId) ? prev.filter((d) => d !== deckId) : [...prev, deckId]
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Pick your decks</h2>
        <p className="text-gray-400 text-sm">Start with community decks. You can always create your own later.</p>
      </div>

      {loadingDecks ? (
        <div className="text-center py-12">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-400 mb-3 block" />
          <p className="text-gray-500 text-sm">Loading community decks...</p>
        </div>
      ) : communityDecks.length === 0 ? (
        <div className="text-center py-12">
          <i className="fa-solid fa-book-open text-2xl text-gray-600 mb-3 block" />
          <p className="text-gray-500 text-sm">No community decks found. You can create your own after setup!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
          {communityDecks.map((deck) => {
            const isSelected = selectedDecks.includes(deck.id);
            return (
              <button
                key={deck.id}
                onClick={() => toggleDeck(deck.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-indigo-600" : "bg-white/10"
                }`}>
                  <i className={`fa-solid fa-layer-group ${isSelected ? "text-white" : "text-gray-400"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-gray-200"}`}>
                    {deck.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {deck.cardCount} cards{deck.author ? ` \u00b7 by ${deck.author}` : ""}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "border-indigo-500 bg-indigo-500" : "border-white/20"
                }`}>
                  {isSelected && <i className="fa-solid fa-check text-[10px] text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
        >
          {selectedDecks.length > 0 ? `Add ${selectedDecks.length} deck${selectedDecks.length > 1 ? "s" : ""} & Continue` : "Skip"}
        </button>
      </div>
    </div>
  );
}

// Step 4: Nova preferences
function StepNovaPrefs({ familiarity, setFamiliarity, studyStyle, setStudyStyle, studyContext, setStudyContext, onNext, onBack }) {
  const [question, setQuestion] = useState(0);

  const questions = [
    {
      title: "How familiar are you with this material?",
      options: FAMILIARITY_OPTIONS,
      value: familiarity,
      setValue: setFamiliarity,
    },
    {
      title: "How do you usually handle tough material?",
      options: STUDY_STYLE_OPTIONS,
      value: studyStyle,
      setValue: setStudyStyle,
    },
    {
      title: "What's your study situation?",
      options: STUDY_CONTEXT_OPTIONS,
      value: studyContext,
      setValue: setStudyContext,
    },
  ];

  const current = questions[question];

  function handleNext() {
    if (question < questions.length - 1) {
      setQuestion(question + 1);
    } else {
      onNext();
    }
  }

  function handleBack() {
    if (question > 0) {
      setQuestion(question - 1);
    } else {
      onBack();
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Help Nova understand you better</h2>
        <p className="text-gray-400 text-sm">This helps your AI tutor adapt to you. Takes 15 seconds.</p>
      </div>

      {/* Sub-progress */}
      <div className="flex gap-1.5 justify-center">
        {questions.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${
            i === question ? "w-8 bg-indigo-500" : i < question ? "w-4 bg-indigo-600" : "w-4 bg-white/10"
          }`} />
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">{current.title}</h3>
        <div className="space-y-2">
          {current.options.map((opt) => (
            <RadioOption key={opt.id} option={opt} selected={current.value} onSelect={current.setValue} />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleBack} className="flex-1 py-3 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          className="py-3 px-5 border border-white/10 text-gray-400 font-medium rounded-xl hover:bg-white/5 transition-colors text-sm"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          disabled={!current.value}
          className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Step 5: Meet your tutors
function StepTutors({ onComplete, onBack, completing }) {
  const novaRef = useRef(null);
  const sageRef = useRef(null);
  const [playingNova, setPlayingNova] = useState(false);
  const [playingSage, setPlayingSage] = useState(false);

  function toggleNova() {
    if (sageRef.current) { sageRef.current.pause(); setPlayingSage(false); }
    if (playingNova) {
      novaRef.current?.pause();
      setPlayingNova(false);
    } else {
      novaRef.current?.play();
      setPlayingNova(true);
    }
  }

  function toggleSage() {
    if (novaRef.current) { novaRef.current.pause(); setPlayingNova(false); }
    if (playingSage) {
      sageRef.current?.pause();
      setPlayingSage(false);
    } else {
      sageRef.current?.play();
      setPlayingSage(true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Meet your tutors</h2>
        <p className="text-gray-400 text-sm">Two AI voices to help you study. Tap play to hear a preview.</p>
      </div>

      {/* Nova card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <i className="fa-solid fa-headset text-white text-lg" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Nova</h3>
            <p className="text-xs text-gray-400">Your voice tutor &mdash; interactive Q&A style</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Nova quizzes you in real-time conversation. She adapts to your pace, gives encouragement, and explains concepts when you're stuck.
        </p>
        <button
          onClick={toggleNova}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            playingNova
              ? "bg-indigo-600 text-white"
              : "bg-white/10 text-gray-300 hover:bg-white/15"
          }`}
        >
          <i className={`fa-solid ${playingNova ? "fa-pause" : "fa-play"}`} />
          {playingNova ? "Pause" : "Play demo"}
        </button>
        <audio
          ref={novaRef}
          src="/nova-demo-real.mp3"
          preload="none"
          onEnded={() => setPlayingNova(false)}
        />
      </div>

      {/* Sage card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <i className="fa-solid fa-podcast text-white text-lg" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Sage</h3>
            <p className="text-xs text-gray-400">Your audio guide &mdash; podcast-style deep dives</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Sage turns your flashcards into engaging audio lessons. Listen while commuting, exercising, or just relaxing.
        </p>
        <button
          onClick={toggleSage}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            playingSage
              ? "bg-emerald-600 text-white"
              : "bg-white/10 text-gray-300 hover:bg-white/15"
          }`}
        >
          <i className={`fa-solid ${playingSage ? "fa-pause" : "fa-play"}`} />
          {playingSage ? "Pause" : "Play demo"}
        </button>
        <audio
          ref={sageRef}
          src="/sage-demo.mp3"
          preload="none"
          onEnded={() => setPlayingSage(false)}
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-colors">
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={completing}
          className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-lg"
        >
          {completing ? (
            <><i className="fa-solid fa-spinner fa-spin mr-2" />Setting up...</>
          ) : (
            <>Start Studying <i className="fa-solid fa-arrow-right ml-2" /></>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(() => generateUsername(user?.email));
  const [subjects, setSubjects] = useState([]);
  const [selectedDecks, setSelectedDecks] = useState([]);
  const [familiarity, setFamiliarity] = useState("");
  const [studyStyle, setStudyStyle] = useState("");
  const [studyContext, setStudyContext] = useState("");

  async function handleComplete() {
    setCompleting(true);
    try {
      // Subscribe to selected community decks
      for (const deckId of selectedDecks) {
        try {
          await subscribeToDeck(deckId);
        } catch (e) {
          console.error("Failed to subscribe to deck:", deckId, e);
        }
      }

      // Build profile object
      const profile = {
        name: name.trim(),
        username: username.trim(),
        email: user?.email || "",
        subjects,
        familiarity: familiarity || null,
        studyStyle: studyStyle || null,
        studyContext: studyContext || null,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      await onComplete(profile);
    } catch (e) {
      console.error("Onboarding completion failed:", e);
      setCompleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-lg">
        <ProgressDots current={step} total={TOTAL_STEPS} />

        <div className="transition-opacity duration-300">
          {step === 0 && (
            <StepWelcome
              name={name}
              setName={setName}
              username={username}
              setUsername={setUsername}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <StepSubjects
              subjects={subjects}
              setSubjects={setSubjects}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepDecks
              subjects={subjects}
              selectedDecks={selectedDecks}
              setSelectedDecks={setSelectedDecks}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepNovaPrefs
              familiarity={familiarity}
              setFamiliarity={setFamiliarity}
              studyStyle={studyStyle}
              setStudyStyle={setStudyStyle}
              studyContext={studyContext}
              setStudyContext={setStudyContext}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepTutors
              onComplete={handleComplete}
              onBack={() => setStep(3)}
              completing={completing}
            />
          )}
        </div>
      </div>
    </div>
  );
}
