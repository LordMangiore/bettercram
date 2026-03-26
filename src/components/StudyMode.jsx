import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createEmptyCard, fsrs, generatorParameters, Rating } from "ts-fsrs";
import confetti from "canvas-confetti";
import { generateHelperCards } from "../api";
import FlashCard from "./FlashCard";
import { RotateIcon } from "./Icons";

function cardKey(card) {
  return card.front.slice(0, 60);
}

const SESSION_SIZES = [10, 20, 30, 50, 100, 0]; // 0 = all

// ---------- FSRS helpers ----------

const f = fsrs(generatorParameters());

/**
 * Get the FSRS card object from progress, creating a new one if needed.
 * Handles backward compatibility with old SM-2 data.
 */
function getFSRSCard(prog) {
  if (prog?.fsrs) {
    // Rehydrate dates from JSON strings
    const c = { ...prog.fsrs };
    c.due = new Date(c.due);
    c.last_review = c.last_review ? new Date(c.last_review) : undefined;
    return c;
  }
  // No FSRS data — create a fresh card (backward compat with SM-2)
  return createEmptyCard();
}

/**
 * Format a duration between now and a future date as a human-readable string.
 */
function formatDue(dueDate) {
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "< 1m";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) {
    const w = Math.round(diffDays / 7);
    return `${w}w`;
  }
  const m = Math.round(diffDays / 30);
  return `${m}mo`;
}

/**
 * Compute projected intervals for all 4 ratings.
 * Returns { again: "< 1m", hard: "10m", good: "1d", easy: "4d" }
 */
function projectedIntervals(prog) {
  const card = getFSRSCard(prog);
  const now = new Date();
  const scheduling = f.repeat(card, now);
  return {
    again: formatDue(scheduling[Rating.Again].card.due),
    hard: formatDue(scheduling[Rating.Hard].card.due),
    good: formatDue(scheduling[Rating.Good].card.due),
    easy: formatDue(scheduling[Rating.Easy].card.due),
  };
}

/**
 * Check if a card is due or new (should be shown in session).
 */
function isDueOrNew(prog) {
  if (!prog || !prog.fsrs) return true; // new card
  const card = getFSRSCard(prog);
  return card.due <= new Date();
}

function isNewCard(prog) {
  if (!prog || !prog.fsrs) return true;
  return prog.fsrs.state === 0;
}

function isLearning(prog) {
  if (!prog || !prog.fsrs) return false;
  return prog.fsrs.state === 1 || prog.fsrs.state === 3;
}

// ---------- Component ----------

export default function StudyMode({ cards, progress, onUpdateProgress }) {
  const [sessionSize, setSessionSize] = useState(() => {
    const saved = localStorage.getItem("bc-study-session-size");
    return saved ? parseInt(saved) : 20;
  });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [againQueue, setAgainQueue] = useState([]);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, again: 0 });
  const [initialized, setInitialized] = useState(false);
  const [swipeDir, setSwipeDir] = useState(null); // "left" | "right" | null
  const pendingRateRef = useRef(null);
  const [sessionStreak, setSessionStreak] = useState(0);

  // Heat level: 0 = none, 1-5 = increasingly intense glow
  const heatLevel = Math.min(5, Math.floor(sessionStreak / 5));

  // Tiered confetti on session completion
  useEffect(() => {
    if (!sessionComplete || sessionStats.reviewed === 0) return;
    const count = sessionStats.correct; // confetti based on correct answers, not total

    const fire = (opts) => confetti({ zIndex: 9999, ...opts });

    if (count >= 100) {
      // NUCLEAR — sustained barrage + screen shake
      const duration = 4000;
      const end = Date.now() + duration;
      const colors = ["#ff0000", "#ff6600", "#ffcc00", "#00ff00", "#0066ff", "#9900ff", "#ff00ff"];
      document.body.style.animation = "shake 0.3s ease-in-out 6";
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        fire({ particleCount: 50, startVelocity: 60, spread: 360, origin: { x: Math.random(), y: Math.random() * 0.4 }, colors, ticks: 100 });
      }, 80);
      // Side cannons
      setTimeout(() => { fire({ particleCount: 200, angle: 60, spread: 80, origin: { x: 0, y: 0.7 }, colors, startVelocity: 70, ticks: 120 }); }, 200);
      setTimeout(() => { fire({ particleCount: 200, angle: 120, spread: 80, origin: { x: 1, y: 0.7 }, colors, startVelocity: 70, ticks: 120 }); }, 400);
      setTimeout(() => { fire({ particleCount: 300, spread: 360, origin: { x: 0.5, y: 0.3 }, colors, startVelocity: 50, ticks: 150 }); }, 800);
      setTimeout(() => { document.body.style.animation = ""; }, duration);
    } else if (count >= 50) {
      // Full screen chaos
      const duration = 3000;
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        fire({ particleCount: 40, startVelocity: 50, spread: 360, origin: { x: Math.random(), y: Math.random() * 0.5 }, ticks: 80 });
      }, 100);
      fire({ particleCount: 150, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, startVelocity: 60 });
      fire({ particleCount: 150, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, startVelocity: 60 });
    } else if (count >= 30) {
      // Solid explosion
      fire({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.5 }, startVelocity: 45 });
      setTimeout(() => {
        fire({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0.1, y: 0.7 }, startVelocity: 50 });
        fire({ particleCount: 80, angle: 120, spread: 60, origin: { x: 0.9, y: 0.7 }, startVelocity: 50 });
      }, 300);
    } else if (count >= 20) {
      // Modest burst
      fire({ particleCount: 80, spread: 70, origin: { x: 0.5, y: 0.6 }, startVelocity: 35 });
      setTimeout(() => {
        fire({ particleCount: 50, spread: 90, origin: { x: 0.3, y: 0.5 }, startVelocity: 30 });
        fire({ particleCount: 50, spread: 90, origin: { x: 0.7, y: 0.5 }, startVelocity: 30 });
      }, 250);
    } else if (count >= 10) {
      // Nice burst — not just a sprinkle
      fire({ particleCount: 60, spread: 80, origin: { x: 0.5, y: 0.5 }, startVelocity: 35, ticks: 70 });
      setTimeout(() => {
        fire({ particleCount: 40, angle: 60, spread: 50, origin: { x: 0.15, y: 0.7 }, startVelocity: 40 });
        fire({ particleCount: 40, angle: 120, spread: 50, origin: { x: 0.85, y: 0.7 }, startVelocity: 40 });
      }, 200);
    }
  }, [sessionComplete, sessionStats.reviewed]);

  // Build pool based on FSRS scheduling
  const buildPool = useCallback((allCards, prog, size) => {
    const now = new Date();

    const learningCards = [];
    const dueCards = [];
    const newCards = [];

    allCards.forEach((c) => {
      const p = prog[cardKey(c)];
      if (isNewCard(p)) {
        newCards.push(c);
      } else if (isLearning(p)) {
        // Learning/Relearning cards — show first
        const card = getFSRSCard(p);
        if (card.due <= now) {
          learningCards.push({ card: c, dueDate: card.due });
        }
      } else {
        // Review cards
        const card = getFSRSCard(p);
        if (card.due <= now) {
          dueCards.push({ card: c, dueDate: card.due });
        }
        // else: not due yet, skip
      }
    });

    // Sort due cards oldest first
    learningCards.sort((a, b) => a.dueDate - b.dueDate);
    dueCards.sort((a, b) => a.dueDate - b.dueDate);

    const ordered = [
      ...learningCards.map((d) => d.card),
      ...dueCards.map((d) => d.card),
      ...newCards,
    ];

    if (size > 0) {
      return ordered.slice(0, size);
    }
    return ordered;
  }, []);

  // Initialize pool
  useEffect(() => {
    if (!initialized) {
      const saved = localStorage.getItem("bc-fsrs-session");
      if (saved) {
        try {
          const s = JSON.parse(saved);
          // Don't restore completed sessions — start fresh
          if (s.sessionComplete) {
            localStorage.removeItem("bc-fsrs-session");
          } else {
            const cardFronts = new Set(cards.map((c) => c.front));
            const validPool = (s.pool || []).filter((c) => cardFronts.has(c.front));
            const validAgain = (s.againQueue || []).filter((c) => cardFronts.has(c.front));
            if (validPool.length > 0 || validAgain.length > 0) {
              setPool(validPool);
              setAgainQueue(validAgain);
              setIndex(Math.min(s.index || 0, Math.max(0, validPool.length - 1)));
              setSessionStats(s.sessionStats || { reviewed: 0, correct: 0, again: 0 });
              setSessionComplete(false);
              setInitialized(true);
              return;
            }
          }
        } catch {}
      }
      // Also clear old SM-2 session data
      localStorage.removeItem("bc-sm2-session");
      const newPool = buildPool(cards, progress, sessionSize);
      setPool(newPool);
      setIndex(0);
      setSessionStats({ reviewed: 0, correct: 0, again: 0 });
      setSessionComplete(newPool.length === 0);
      setInitialized(true);
    }
  }, [initialized, cards, progress, sessionSize, buildPool]);

  // Persist session
  useEffect(() => {
    if (initialized) {
      localStorage.setItem(
        "bc-fsrs-session",
        JSON.stringify({ pool, againQueue, index, sessionStats, sessionComplete })
      );
    }
  }, [pool, againQueue, index, sessionStats, sessionComplete, initialized]);

  useEffect(() => {
    localStorage.setItem("bc-study-session-size", sessionSize.toString());
  }, [sessionSize]);

  // Global stats
  const stats = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let dueToday = 0;
    let learning = 0;
    let young = 0;
    let mature = 0;
    let newCount = 0;

    cards.forEach((c) => {
      const p = progress[cardKey(c)];
      if (isNewCard(p)) {
        newCount++;
      } else {
        const card = getFSRSCard(p);
        const state = card.state;
        if (state === 1 || state === 3) {
          // Learning or Relearning
          learning++;
          if (card.due <= endOfToday) dueToday++;
        } else if (state === 2) {
          // Review
          const intervalDays = card.scheduled_days || 0;
          if (intervalDays >= 21) {
            mature++;
          } else {
            young++;
          }
          if (card.due <= endOfToday) dueToday++;
        }
      }
    });

    return { dueToday, learning, young, mature, newCount, total: cards.length };
  }, [cards, progress]);

  // Current card: againQueue first, then pool
  const currentCard = useMemo(() => {
    if (againQueue.length > 0) return againQueue[0];
    if (index < pool.length) return pool[index];
    return null;
  }, [againQueue, pool, index]);

  const cardProgress = currentCard ? progress[cardKey(currentCard)] : null;
  const intervals = cardProgress || currentCard ? projectedIntervals(cardProgress) : null;

  // Rating map: button index -> FSRS Rating
  const ratingMap = {
    [Rating.Again]: Rating.Again,
    [Rating.Hard]: Rating.Hard,
    [Rating.Good]: Rating.Good,
    [Rating.Easy]: Rating.Easy,
  };

  function applyRating(rating) {
    if (!currentCard) return;

    const key = cardKey(currentCard);
    const prev = progress[key] || {};
    const card = getFSRSCard(prev);
    const now = new Date();
    const scheduling = f.repeat(card, now);
    const result = scheduling[rating];
    const updatedCard = result.card;

    // Serialize the FSRS card for storage (dates to ISO strings)
    const fsrsData = {
      due: updatedCard.due.toISOString(),
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsed_days: updatedCard.elapsed_days,
      scheduled_days: updatedCard.scheduled_days,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      state: updatedCard.state,
      last_review: updatedCard.last_review ? updatedCard.last_review.toISOString() : null,
    };

    // Keep old fields for backward compat, add fsrs data
    const updated = {
      ...prev,
      fsrs: fsrsData,
      lastSeen: Date.now(),
    };

    onUpdateProgress(key, updated);

    // Auto-generate helper cards when a card hits 3+ lapses (fire and forget)
    if (rating === Rating.Again && updatedCard.lapses >= 3 && !prev._helpersGenerated) {
      onUpdateProgress(key, { ...updated, _helpersGenerated: true });
      generateHelperCards(currentCard).then(({ cards: helpers }) => {
        if (helpers?.length > 0) {
          // Add helper cards to the pool for this session
          setPool(p => [...p, ...helpers]);
        }
      }).catch(() => {});
    }

    // Stats
    setSessionStats((s) => ({
      reviewed: s.reviewed + 1,
      correct: rating >= Rating.Good ? s.correct + 1 : s.correct,
      again: rating === Rating.Again ? s.again + 1 : s.again,
    }));

    // Session streak: consecutive Good/Easy resets on Again/Hard
    if (rating >= Rating.Good) {
      setSessionStreak((s) => s + 1);
    } else {
      setSessionStreak(0);
    }

    if (againQueue.length > 0) {
      // We're reviewing an "again" card
      const remaining = againQueue.slice(1);
      if (rating === Rating.Again) {
        // Still forgot — put back at end of again queue
        setAgainQueue([...remaining, currentCard]);
      } else {
        setAgainQueue(remaining);
      }
    } else {
      // Regular pool card
      if (rating === Rating.Again) {
        // Add to again queue for immediate re-review
        setAgainQueue((q) => [...q, currentCard]);
      }
      // Advance
      if (index < pool.length - 1) {
        setIndex((i) => i + 1);
      } else {
        // Pool exhausted
        if (againQueue.length === 0 && rating !== Rating.Again) {
          setSessionComplete(true);
        }
      }
    }

    // Check if session is truly complete (pool done + again queue empty)
    if (againQueue.length === 0 && rating !== Rating.Again && index >= pool.length - 1 && pool.length > 0) {
      setSessionComplete(true);
    }
  }

  function handleRate(rating) {
    if (!currentCard || swipeDir) return;
    // Swipe left for Again/Hard, right for Good/Easy
    const dir = rating >= Rating.Good ? "right" : "left";
    pendingRateRef.current = rating;
    setSwipeDir(dir);
  }

  // After swipe animation finishes, apply the actual rating
  function handleSwipeEnd() {
    const rating = pendingRateRef.current;
    pendingRateRef.current = null;
    setSwipeDir(null);
    if (rating != null) applyRating(rating);
  }

  function resetSession() {
    localStorage.removeItem("bc-fsrs-session");
    const newPool = buildPool(cards, progress, sessionSize);
    setPool(newPool);
    setIndex(0);
    setAgainQueue([]);
    setSessionStats({ reviewed: 0, correct: 0, again: 0 });
    setSessionStreak(0);
    setSessionComplete(newPool.length === 0);
  }

  function startStudyAhead() {
    localStorage.removeItem("bc-fsrs-session");
    // Include ALL cards regardless of due date, shuffled
    const allCards = [...cards].sort(() => Math.random() - 0.5);
    const capped = sessionSize > 0 ? allCards.slice(0, sessionSize) : allCards;
    setPool(capped);
    setIndex(0);
    setAgainQueue([]);
    setSessionStats({ reviewed: 0, correct: 0, again: 0 });
    setSessionStreak(0);
    setSessionComplete(false);
  }

  function handleSessionSizeChange(size) {
    setSessionSize(size);
    localStorage.removeItem("bc-fsrs-session");
    const newPool = buildPool(cards, progress, size);
    setPool(newPool);
    setIndex(0);
    setAgainQueue([]);
    setSessionStats({ reviewed: 0, correct: 0, again: 0 });
    setSessionStreak(0);
    setSessionComplete(newPool.length === 0);
  }

  if (!initialized) return null;

  // No cards in deck at all
  if (cards.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <i className="fa-solid fa-cards-blank text-3xl text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          No cards yet
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Add cards to this deck to start studying.
        </p>
      </div>
    );
  }

  // Session complete screen — only show if you actually reviewed cards
  if (sessionComplete && sessionStats.reviewed > 0) {
    const accuracy =
      sessionStats.reviewed > 0
        ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
        : 0;

    // Next review summary
    const nextReviews = cards
      .map((c) => {
        const p = progress[cardKey(c)];
        if (!p?.fsrs?.due) return null;
        return new Date(p.fsrs.due);
      })
      .filter(Boolean)
      .sort((a, b) => a - b);

    const nextDue = nextReviews.find((d) => d > new Date());

    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 mb-4">
            <i className="fa-solid fa-circle-check text-4xl text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Session Complete!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Great work! Here's how you did.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4">
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              {sessionStats.reviewed}
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-500">Reviewed</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {accuracy}%
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">Accuracy</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {sessionStats.again}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">Forgot</p>
          </div>
        </div>

        {nextDue && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            <i className="fa-solid fa-clock mr-1" />
            Next review due: {nextDue.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </p>
        )}

        <button
          onClick={resetSession}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <RotateIcon className="inline mr-2" /> Start New Session
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 mb-4">
          <i className="fa-solid fa-check-double text-3xl text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          All caught up!
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          No cards are due right now. Want to study ahead?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={startStudyAhead}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <i className="fa-solid fa-forward mr-2" />
            Study Ahead
          </button>
          <button
            onClick={resetSession}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateIcon className="inline mr-2" /> Refresh Due Cards
          </button>
        </div>
      </div>
    );
  }

  const poolPosition = againQueue.length > 0 ? index : index + 1;
  const totalInSession = pool.length;
  const progressPct = totalInSession > 0 ? (Math.min(poolPosition, totalInSession) / totalInSession) * 100 : 0;

  const fsrsCard = getFSRSCard(cardProgress);
  // Use session streak (consecutive Good/Easy in this session) for display
  const streak = sessionStreak;

  // Card state label
  const stateLabel = fsrsCard.state === 0 ? "New" : fsrsCard.state === 1 ? "Learning" : fsrsCard.state === 2 ? "Review" : "Relearning";

  // Card type rotation — for review cards (reps > 1), sometimes show as a different format
  const displayCard = useMemo(() => {
    if (!currentCard) return null;
    try {
      const reps = fsrsCard.reps || 0;
      // Only rotate for cards that have been seen 2+ times
      if (reps < 2) return currentCard;
      // Use a deterministic "random" based on card + reps to be consistent
      const hash = (currentCard.front.length * 31 + reps * 7) % 100;
      if (hash < 30) {
        // Gap fill: replace a key term in the front with ______
        const words = (currentCard.back || "").split(/\s+/).filter(w => w.length > 4);
        if (words.length > 0) {
          const keyWord = words[Math.min(Math.floor(hash / 10), words.length - 1)];
          const cleanWord = keyWord.replace(/[.,;:!?()]/g, "");
          if (cleanWord) {
            return {
              ...currentCard,
              front: `Fill in the blank: ${currentCard.back.replace(new RegExp(cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), "______").slice(0, 200)}`,
              _rotated: "gap-fill",
            };
          }
        }
      } else if (hash < 45) {
        // Reverse card: show answer, ask for the question concept
        return {
          ...currentCard,
          front: `What concept does this describe?\n\n"${(currentCard.back || "").slice(0, 150)}${(currentCard.back || "").length > 150 ? "..." : ""}"`,
          back: currentCard.front,
          _rotated: "reversed",
        };
      }
      return currentCard;
    } catch {
      return currentCard;
    }
  }, [currentCard, fsrsCard.reps]);

  return (
    <div>
      {/* Session size selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-layer-group mr-1" />
            Session:
          </span>
          <div className="flex gap-1">
            {SESSION_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => handleSessionSizeChange(size)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  sessionSize === size
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {size === 0 ? "All" : size}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {againQueue.length > 0 ? (
            <span className="text-red-500">
              <i className="fa-solid fa-rotate-left mr-1" />
              {againQueue.length} to redo
            </span>
          ) : (
            `${poolPosition} / ${totalInSession}`
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-4">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
            {stats.dueToday}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-500">Due Today</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">
            {stats.learning}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500">Learning</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
            {stats.young}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-500">Young</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-700 dark:text-green-400">
            {stats.mature}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">Mature</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">
            {stats.newCount}
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-500">New</p>
        </div>
      </div>

      {/* Card with slide animation + heat glow */}
      <div className="rounded-2xl mb-4">
        <div
          className={swipeDir === "left" ? "animate-slide-out-left" : swipeDir === "right" ? "animate-slide-out-right" : "animate-slide-in"}
          onAnimationEnd={handleSwipeEnd}
        >
          <FlashCard
            card={displayCard || currentCard}
            cardKey={`study-${againQueue.length > 0 ? "again-" + currentCard.front.slice(0, 20) : index}-${displayCard?._rotated || ""}`}
            showActions
            sm2Rating
            intervals={intervals}
            onRate={handleRate}
            heatLevel={heatLevel}
          />
        </div>
      </div>

      {/* Streak / state indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-fire mr-1" />
            Streak:
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`text-base transition-all duration-300 ${
                  n <= streak
                    ? "opacity-100 scale-110"
                    : "opacity-20 grayscale"
                }`}
                style={n <= streak ? { filter: "none" } : { filter: "grayscale(1)" }}
              >
                🔥
              </span>
            ))}
          </div>
          {streak >= 5 && (
            <span className="text-xs text-orange-500 font-bold animate-pulse">FIRE!</span>
          )}
          {streak >= 3 && streak < 5 && (
            <span className="text-xs text-orange-400 font-medium">On fire!</span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {stateLabel} | S: {fsrsCard.stability?.toFixed(1) || "0.0"} | D: {fsrsCard.difficulty?.toFixed(1) || "0.0"}
        </span>
      </div>

      <div className="text-center">
        <button
          onClick={resetSession}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1.5 mx-auto"
        >
          <RotateIcon className="text-xs" /> New Session
        </button>
      </div>
    </div>
  );
}
