import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Rating } from "ts-fsrs";
import confetti from "canvas-confetti";
import FlashCard from "./FlashCard";
import { RotateIcon } from "./Icons";
import { saveReviewEvents, trackActivity } from "../api";
import { cardKey, createFSRS, getFSRSCard, formatDue, projectedIntervals, isDueOrNew, isNewCard, isLearning, buildPool as buildPoolFn } from "../lib/fsrsHelpers";

const SESSION_SIZES = [10, 20, 30, 50, 100, 0]; // 0 = all

// ---------- Component ----------

export default function StudyMode({ cards, progress, onUpdateProgress, onSessionStatsChange, deckId, fsrsParams, onRegenCard, onSuspendCard }) {
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
  const [showSettings, setShowSettings] = useState(false);
  const [lastAction, setLastAction] = useState(null); // { card, rating, prevProgress, prevIndex, prevAgainQueue, prevStats, prevStreak }

  // Review log buffer — flush to server periodically
  const reviewLogRef = useRef([]);
  const flushTimerRef = useRef(null);

  // Retention target from settings
  const [retentionTarget, setRetentionTarget] = useState(() => {
    const saved = localStorage.getItem("bc-retention-target");
    return saved ? parseFloat(saved) : 0.9;
  });

  // New card mix: what % of the session should be new cards (0 = FSRS decides, 25/50/75/100)
  const [newCardMix, setNewCardMix] = useState(() => {
    const saved = localStorage.getItem("bc-new-card-mix");
    return saved ? parseInt(saved) : 0;
  });

  // Create FSRS instance with custom params and retention target
  const fInstance = useMemo(() => {
    return createFSRS(fsrsParams, retentionTarget);
  }, [fsrsParams, retentionTarget]);

  // Flush review log to server
  const flushReviewLog = useCallback(() => {
    if (reviewLogRef.current.length === 0 || !deckId) return;
    const events = [...reviewLogRef.current];
    reviewLogRef.current = [];
    saveReviewEvents(deckId, events).catch((err) => {
      // Put events back on failure
      reviewLogRef.current.unshift(...events);
      console.error("Failed to flush review log:", err);
    });
    // Track daily activity (fire and forget)
    const correct = events.filter(e => e.rating >= 2).length;
    trackActivity(events.length, correct, deckId);
  }, [deckId]);

  // Flush on unmount and periodically
  useEffect(() => {
    return () => {
      flushReviewLog();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [flushReviewLog]);

  // Save retention target to localStorage
  useEffect(() => {
    localStorage.setItem("bc-retention-target", retentionTarget.toString());
  }, [retentionTarget]);

  // Ctrl+Z / Cmd+Z to undo last rating
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && lastAction) {
        e.preventDefault();
        undoLastRating();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lastAction]);

  // Heat level: 0 = none, 1-5 = increasingly intense glow
  const heatLevel = Math.min(5, Math.floor(sessionStreak / 5));

  // Tiered confetti on session completion
  useEffect(() => {
    if (!sessionComplete || sessionStats.reviewed === 0) return;
    const count = sessionStats.correct; // confetti based on correct answers, not total

    const fire = (opts) => confetti({ zIndex: 9999, ...opts });

    if (count >= 100) {
      // NUCLEAR — absolute chaos, the screen should feel like it's going to break
      const duration = 8000;
      const end = Date.now() + duration;
      const colors = ["#ff0000", "#ff6600", "#ffcc00", "#00ff00", "#0066ff", "#9900ff", "#ff00ff", "#ffffff"];
      const shapes = ["circle", "square"];

      // Screen shake — escalating intensity
      document.body.style.animation = "shake 0.15s ease-in-out infinite";

      // Phase 1: Rapid-fire from everywhere (0-3s)
      const barrage = setInterval(() => {
        if (Date.now() > end - 5000) { clearInterval(barrage); return; }
        fire({ particleCount: 80, startVelocity: 70, spread: 360, origin: { x: Math.random(), y: Math.random() * 0.6 }, colors, ticks: 120, shapes });
      }, 50);

      // Phase 1: Side cannons alternating
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          fire({ particleCount: 250, angle: 60, spread: 55, origin: { x: 0, y: 0.6 + Math.random() * 0.3 }, colors, startVelocity: 80, ticks: 150, shapes });
        }, i * 300);
        setTimeout(() => {
          fire({ particleCount: 250, angle: 120, spread: 55, origin: { x: 1, y: 0.6 + Math.random() * 0.3 }, colors, startVelocity: 80, ticks: 150, shapes });
        }, i * 300 + 150);
      }

      // Phase 2: Mega bursts from center (2-5s)
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          fire({ particleCount: 400, spread: 360, origin: { x: 0.3 + Math.random() * 0.4, y: 0.2 + Math.random() * 0.3 }, colors, startVelocity: 60, ticks: 200, gravity: 0.8, shapes });
        }, 2000 + i * 500);
      }

      // Phase 3: The finale — everything at once (5-8s)
      setTimeout(() => {
        // Triple burst from bottom
        fire({ particleCount: 500, angle: 90, spread: 120, origin: { x: 0.2, y: 1 }, colors, startVelocity: 90, ticks: 200, gravity: 1.2 });
        fire({ particleCount: 500, angle: 90, spread: 120, origin: { x: 0.5, y: 1 }, colors, startVelocity: 100, ticks: 200, gravity: 1.2 });
        fire({ particleCount: 500, angle: 90, spread: 120, origin: { x: 0.8, y: 1 }, colors, startVelocity: 90, ticks: 200, gravity: 1.2 });
      }, 5000);

      // The grand finale burst
      setTimeout(() => {
        fire({ particleCount: 800, spread: 360, origin: { x: 0.5, y: 0.4 }, colors, startVelocity: 80, ticks: 300, gravity: 0.5, scalar: 1.5, shapes });
      }, 6000);

      // Slow rain of gold (6-8s)
      setTimeout(() => {
        const goldRain = setInterval(() => {
          if (Date.now() > end) { clearInterval(goldRain); return; }
          fire({ particleCount: 15, startVelocity: 10, spread: 360, origin: { x: Math.random(), y: -0.1 }, colors: ["#FFD700", "#FFA500", "#FFFFFF"], ticks: 200, gravity: 0.3, scalar: 2 });
        }, 100);
      }, 6000);

      // Clean up
      setTimeout(() => { document.body.style.animation = ""; }, duration);
    } else if (count >= 50) {
      // Full screen war — side cannons + sustained barrage + shake
      const duration = 5000;
      const end = Date.now() + duration;
      const colors = ["#ff0000", "#ff6600", "#ffcc00", "#00ff00", "#0066ff", "#9900ff"];
      document.body.style.animation = "shake 0.2s ease-in-out infinite";
      const interval = setInterval(() => {
        if (Date.now() > end) { clearInterval(interval); return; }
        fire({ particleCount: 60, startVelocity: 55, spread: 360, origin: { x: Math.random(), y: Math.random() * 0.5 }, colors, ticks: 100 });
      }, 70);
      // Side cannons
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          fire({ particleCount: 200, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, startVelocity: 70, ticks: 120 });
          fire({ particleCount: 200, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, startVelocity: 70, ticks: 120 });
        }, i * 600);
      }
      // Center mega burst
      setTimeout(() => { fire({ particleCount: 300, spread: 360, origin: { x: 0.5, y: 0.4 }, colors, startVelocity: 60, ticks: 150 }); }, 2500);
      setTimeout(() => { document.body.style.animation = ""; }, duration);
    } else if (count >= 30) {
      // Serious explosion — three waves
      const colors = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b"];
      fire({ particleCount: 200, spread: 120, origin: { x: 0.5, y: 0.5 }, startVelocity: 50, colors, ticks: 100 });
      setTimeout(() => {
        fire({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, startVelocity: 55, colors });
        fire({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, startVelocity: 55, colors });
      }, 300);
      setTimeout(() => {
        fire({ particleCount: 200, spread: 360, origin: { x: 0.5, y: 0.3 }, startVelocity: 40, colors, ticks: 120 });
      }, 700);
    } else if (count >= 20) {
      // Double burst with side shots
      fire({ particleCount: 120, spread: 90, origin: { x: 0.5, y: 0.5 }, startVelocity: 40, ticks: 80 });
      setTimeout(() => {
        fire({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0.1, y: 0.7 }, startVelocity: 45 });
        fire({ particleCount: 80, angle: 120, spread: 55, origin: { x: 0.9, y: 0.7 }, startVelocity: 45 });
      }, 250);
      setTimeout(() => {
        fire({ particleCount: 100, spread: 360, origin: { x: 0.5, y: 0.4 }, startVelocity: 35, ticks: 100 });
      }, 500);
    } else if (count >= 10) {
      // Proper burst — two waves
      fire({ particleCount: 100, spread: 100, origin: { x: 0.5, y: 0.5 }, startVelocity: 40, ticks: 80 });
      setTimeout(() => {
        fire({ particleCount: 60, angle: 60, spread: 50, origin: { x: 0.15, y: 0.7 }, startVelocity: 45 });
        fire({ particleCount: 60, angle: 120, spread: 50, origin: { x: 0.85, y: 0.7 }, startVelocity: 45 });
      }, 200);
    } else if (count >= 5) {
      // Small but satisfying
      fire({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.6 }, startVelocity: 30, ticks: 60 });
    }
  }, [sessionComplete, sessionStats.reviewed]);

  // Build pool based on FSRS scheduling
  const buildPool = useCallback((allCards, prog, size) => {
    return buildPoolFn(allCards, prog, size, newCardMix);
  }, [newCardMix]);

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

  // Persist session (skip if data is too large for localStorage)
  useEffect(() => {
    if (initialized) {
      try {
        // Only save minimal session state, not full card data
        const sessionData = { poolIds: pool.map(c => c.id || c.front?.slice(0, 40)), againIds: againQueue.map(c => c.id || c.front?.slice(0, 40)), index, sessionStats, sessionComplete };
        localStorage.setItem("bc-fsrs-session", JSON.stringify(sessionData));
      } catch {}
    }
  }, [pool, againQueue, index, sessionStats, sessionComplete, initialized]);

  useEffect(() => {
    localStorage.setItem("bc-study-session-size", sessionSize.toString());
  }, [sessionSize]);

  // Report session stats to parent for Voice Tutor empathy engine
  useEffect(() => {
    if (onSessionStatsChange && initialized) {
      onSessionStatsChange({ ...sessionStats, streak: sessionStreak });
    }
  }, [sessionStats, sessionStreak, onSessionStatsChange, initialized]);

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
  const intervals = cardProgress || currentCard ? projectedIntervals(cardProgress, fInstance) : null;

  // Rating map: button index -> FSRS Rating
  const ratingMap = {
    [Rating.Again]: Rating.Again,
    [Rating.Hard]: Rating.Hard,
    [Rating.Good]: Rating.Good,
    [Rating.Easy]: Rating.Easy,
  };

  function undoLastRating() {
    if (!lastAction) return;
    const { prevProgress, prevIndex, prevAgainQueue, prevStats, prevStreak } = lastAction;
    onUpdateProgress(prevProgress);
    setIndex(prevIndex);
    setAgainQueue(prevAgainQueue);
    setSessionStats(prevStats);
    setSessionStreak(prevStreak);
    setSessionComplete(false);
    setLastAction(null);
  }

  function applyRating(rating) {
    if (!currentCard) return;

    // Save state for undo
    setLastAction({
      card: currentCard,
      rating,
      prevProgress: { ...progress },
      prevIndex: index,
      prevAgainQueue: [...againQueue],
      prevStats: { ...sessionStats },
      prevStreak: sessionStreak,
    });

    const key = cardKey(currentCard);
    const prev = progress[key] || {};
    const card = getFSRSCard(prev);
    const now = new Date();
    const scheduling = fInstance.repeat(card, now);
    const result = scheduling[rating];
    const updatedCard = result.card;

    // Log review event for parameter optimization
    reviewLogRef.current.push({
      cardKey: key,
      rating,
      timestamp: now.toISOString(),
      elapsed_days: card.elapsed_days || 0,
      scheduled_days: card.scheduled_days || 0,
      state: card.state,
      stability: card.stability,
      difficulty: card.difficulty,
      newStability: updatedCard.stability,
      newDifficulty: updatedCard.difficulty,
      newDue: updatedCard.due.toISOString(),
    });

    // Flush every 10 reviews
    if (reviewLogRef.current.length >= 10) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flushReviewLog, 500);
    }

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
      // Track study session completion
      if (window.plausible) {
        window.plausible("Study Session Complete", { props: {
          reviewed: String(sessionStats.reviewed + 1),
          correct: String(sessionStats.correct + (rating >= Rating.Good ? 1 : 0)),
          accuracy: String(Math.round(((sessionStats.correct + (rating >= Rating.Good ? 1 : 0)) / (sessionStats.reviewed + 1)) * 100)),
        }});
      }
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

  return (
    <div>
      {/* Compact status bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {againQueue.length > 0 ? (
              <span className="text-red-500">
                <i className="fa-solid fa-rotate-left mr-1" />
                {againQueue.length} to redo
              </span>
            ) : (
              <>{poolPosition} / {totalInSession}</>
            )}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`text-sm transition-all duration-300 ${
                  n <= streak ? "opacity-100 scale-110" : "opacity-20"
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
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
            showSettings
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <i className={`fa-solid ${showSettings ? "fa-times" : "fa-sliders"}`} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Session breakdown: New / Learning / Review */}
      {(() => {
        const newCount = pool.filter(c => isNewCard(progress[cardKey(c)])).length;
        const learnCount = pool.filter(c => { const p = progress[cardKey(c)]; return p?.fsrs && (p.fsrs.state === 1 || p.fsrs.state === 3); }).length;
        const reviewCount = pool.length - newCount - learnCount;
        return (
          <div className="flex items-center gap-3 mb-3 text-[10px]">
            <span className="text-blue-500"><i className="fa-solid fa-circle text-[6px] mr-1" />{newCount} new</span>
            <span className="text-orange-500"><i className="fa-solid fa-circle text-[6px] mr-1" />{learnCount} learning</span>
            <span className="text-green-500"><i className="fa-solid fa-circle text-[6px] mr-1" />{reviewCount} review</span>
            {againQueue.length > 0 && <span className="text-red-500"><i className="fa-solid fa-circle text-[6px] mr-1" />{againQueue.length} again</span>}
          </div>
        );
      })()}

      {/* Expandable settings drawer */}
      {showSettings && (
        <div className="mb-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-4 animate-slide-in">
          {/* Session size */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <i className="fa-solid fa-layer-group mr-1" />
              Session
            </span>
            <div className="flex gap-1">
              {SESSION_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => handleSessionSizeChange(size)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    sessionSize === size
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {size === 0 ? "All" : size}
                </button>
              ))}
            </div>
          </div>

          {/* Retention target */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <i className="fa-solid fa-bullseye mr-1" />
              Retention
            </span>
            <div className="flex gap-1">
              {[0.85, 0.9, 0.95].map((target) => (
                <button
                  key={target}
                  onClick={() => setRetentionTarget(target)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    retentionTarget === target
                      ? "bg-emerald-600 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {Math.round(target * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* New card mix */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <i className="fa-solid fa-sparkles mr-1" />
              New cards
            </span>
            <div className="flex gap-1">
              {[
                { val: 0, label: "Auto" },
                { val: 25, label: "25%" },
                { val: 50, label: "50%" },
                { val: 75, label: "75%" },
                { val: 100, label: "All" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => {
                    setNewCardMix(val);
                    localStorage.setItem("bc-new-card-mix", String(val));
                  }}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    newCardMix === val
                      ? "bg-purple-600 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Show intervals toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <i className="fa-solid fa-clock mr-1" />
              Show intervals
            </span>
            <button
              onClick={() => {
                const current = localStorage.getItem("bc-show-intervals") === "true";
                localStorage.setItem("bc-show-intervals", current ? "false" : "true");
                // Force re-render
                setRetentionTarget(prev => prev);
              }}
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                localStorage.getItem("bc-show-intervals") === "true" ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
              } cursor-pointer`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                localStorage.getItem("bc-show-intervals") === "true" ? "translate-x-5" : "translate-x-1"
              }`} />
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 gap-1.5 md:gap-2">
            {[
              { val: stats.dueToday, label: "Due", color: "text-orange-500" },
              { val: stats.learning, label: "Learn", color: "text-yellow-500" },
              { val: stats.young, label: "Young", color: "text-blue-500" },
              { val: stats.mature, label: "Mature", color: "text-green-500" },
              { val: stats.newCount, label: "New", color: "text-indigo-500" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* FSRS card info */}
          <div className="text-center text-xs text-gray-400 dark:text-gray-500">
            {stateLabel} | S: {fsrsCard.stability?.toFixed(1) || "0.0"} | D: {fsrsCard.difficulty?.toFixed(1) || "0.0"}
          </div>
        </div>
      )}

      {/* Card with slide animation + heat glow */}
      <div className="rounded-2xl mx-2 sm:mx-0 md:mx-4 overflow-x-clip">
        <div
          className={swipeDir === "left" ? "animate-slide-out-left" : swipeDir === "right" ? "animate-slide-out-right" : "animate-slide-in"}
          onAnimationEnd={handleSwipeEnd}
        >
          <FlashCard
            card={currentCard}
            cardKey={`study-${againQueue.length > 0 ? "again-" + currentCard.front.slice(0, 20) : index}`}
            showActions
            sm2Rating
            intervals={intervals}
            onRate={handleRate}
            heatLevel={heatLevel}
            onRegenCard={onRegenCard}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        {lastAction && (
          <button
            onClick={undoLastRating}
            className="text-sm text-indigo-500 hover:text-indigo-400 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-rotate-left text-xs" /> Undo
          </button>
        )}
        {onSuspendCard && currentCard && (
          <button
            onClick={() => {
              onSuspendCard(currentCard);
              // Skip to next card
              if (index < pool.length - 1) setIndex(i => i + 1);
            }}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-amber-500 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-eye-slash text-xs" /> Suspend
          </button>
        )}
        <button
          onClick={resetSession}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1.5"
        >
          <RotateIcon className="text-xs" /> New Session
        </button>
      </div>
    </div>
  );
}
