import { useState, useMemo, useEffect, useCallback } from "react";
import { loadActivity } from "../api";
import ActivityCalendar from "./ActivityCalendar";
import { DECK_COLORS } from "./deck-library/DeckCardMenu";

const DEFAULT_DECK_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-amber-500 to-yellow-600",
  "from-violet-500 to-fuchsia-600",
  "from-lime-500 to-green-600",
];

function getDeckGradient(deck, index) {
  if (deck.color) {
    const found = DECK_COLORS.find(c => c.id === deck.color);
    if (found) return found.gradient;
  }
  return DEFAULT_DECK_COLORS[index % DEFAULT_DECK_COLORS.length];
}

// ─── FSRS state helpers ─────────────────────────────────────

function getCardKey(card) {
  return card.front?.slice(0, 60) || card.id;
}

function getFSRSDue(prog) {
  if (prog?.fsrs?.due) return new Date(prog.fsrs.due);
  if (prog?.nextReview) return new Date(prog.nextReview);
  return null;
}

function isNew(prog) {
  return !prog || (!prog.fsrs && !prog.nextReview && !prog.repetitions);
}

function isLearningState(prog) {
  const st = prog?.fsrs?.state;
  return st === 1 || st === 3;
}

function isDue(prog) {
  if (isNew(prog)) return false;
  const due = getFSRSDue(prog);
  if (!due) return true;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return due <= endOfToday;
}

function wasReviewedToday(prog) {
  if (!prog) return false;
  const lr = prog?.fsrs?.last_review || prog?.lastSeen;
  if (!lr) return false;
  const today = new Date().toISOString().split("T")[0];
  return new Date(lr).toISOString().startsWith(today);
}

// ─── Compute per-deck stats ─────────────────────────────────

function computeDeckStats(cards, progress) {
  let newCount = 0, learningCount = 0, reviewCount = 0, studiedToday = 0;

  cards.forEach(card => {
    const key = getCardKey(card);
    const prog = progress?.[key];

    if (isNew(prog)) {
      newCount++;
    } else if (isLearningState(prog)) {
      if (isDue({ ...prog })) learningCount++;
    } else if (isDue(prog)) {
      reviewCount++;
    }

    if (wasReviewedToday(prog)) studiedToday++;
  });

  return { newCount, learningCount, reviewCount, studiedToday, total: cards.length };
}

// ─── Category breakdown ─────────────────────────────────────

function computeCategoryStats(cards, progress) {
  const cats = {};

  cards.forEach(card => {
    const cat = card.category || "Uncategorized";
    if (!cats[cat]) cats[cat] = { newCount: 0, learningCount: 0, reviewCount: 0, total: 0 };
    cats[cat].total++;

    const key = getCardKey(card);
    const prog = progress?.[key];

    if (isNew(prog)) cats[cat].newCount++;
    else if (isLearningState(prog) && isDue(prog)) cats[cat].learningCount++;
    else if (isDue(prog)) cats[cat].reviewCount++;
  });

  return Object.entries(cats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => (b.reviewCount + b.learningCount + b.newCount) - (a.reviewCount + a.learningCount + a.newCount));
}

// ─── Main component ─────────────────────────────────────────

export default function DeckDashboard({ decks, activeDeckId, cards, progress, onSelectDeck, onStartStudy }) {
  const [expandedDeck, setExpandedDeck] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [activity, setActivity] = useState([]);
  const [streak, setStreak] = useState(0);

  // Compute stats for the active deck (we have full card + progress data)
  const activeStats = useMemo(() => {
    if (!cards?.length) return null;
    return computeDeckStats(cards, progress);
  }, [cards, progress]);

  const categoryStats = useMemo(() => {
    if (!cards?.length || expandedDeck !== activeDeckId) return [];
    return computeCategoryStats(cards, progress);
  }, [cards, progress, expandedDeck, activeDeckId]);

  // Load activity data when expanded
  useEffect(() => {
    if (showActivity) {
      loadActivity(180).then(({ activity: a }) => {
        setActivity(a || []);
        // Compute streak
        let s = 0;
        const today = new Date().toISOString().split("T")[0];
        const actSet = new Set(a.filter(d => d.reviews > 0).map(d => d.date));
        const d = new Date();
        if (actSet.has(today)) {
          while (actSet.has(d.toISOString().split("T")[0])) {
            s++;
            d.setDate(d.getDate() - 1);
          }
        } else {
          d.setDate(d.getDate() - 1);
          while (actSet.has(d.toISOString().split("T")[0])) {
            s++;
            d.setDate(d.getDate() - 1);
          }
        }
        setStreak(s);
      }).catch(() => {});
    }
  }, [showActivity]);

  // Summary counts across all decks (approximate — only active deck has real data)
  const totalDue = activeStats ? (activeStats.learningCount + activeStats.reviewCount) : 0;
  const totalNew = activeStats ? activeStats.newCount : 0;

  // Estimate time: ~15 seconds per review card, ~20 seconds per new card
  const estMinutes = Math.max(1, Math.round((totalDue * 15 + Math.min(totalNew, 20) * 20) / 60));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{greeting}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalDue > 0
              ? `${totalDue} card${totalDue !== 1 ? "s" : ""} due · ~${estMinutes} min`
              : totalNew > 0
                ? `${totalNew} new card${totalNew !== 1 ? "s" : ""} to learn`
                : "All caught up!"
            }
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full">
            <i className="fa-solid fa-fire text-orange-500 text-sm" />
            <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{streak}</span>
          </div>
        )}
      </div>

      {/* Deck list — Anki style */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <span className="flex-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Deck</span>
          <span className="w-14 text-center text-xs font-semibold text-blue-500 uppercase tracking-wider">New</span>
          <span className="w-14 text-center text-xs font-semibold text-orange-500 uppercase tracking-wider">Learn</span>
          <span className="w-14 text-center text-xs font-semibold text-green-500 uppercase tracking-wider">Due</span>
        </div>

        {decks.filter(d => !d.isCollab || d.cardCount > 0).map((deck, deckIndex) => {
          const isActive = deck.id === activeDeckId;
          const stats = isActive && activeStats ? activeStats : null;
          const isExpanded = expandedDeck === deck.id;
          const hasCategories = isExpanded && categoryStats.length > 1;

          return (
            <div key={deck.id}>
              {/* Deck row */}
              <div
                className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-indigo-50/50 dark:bg-indigo-900/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
                onClick={() => {
                  if (deck.id !== activeDeckId) {
                    onSelectDeck(deck.id);
                  }
                  setExpandedDeck(isExpanded ? null : deck.id);
                }}
              >
                {/* Color dot + expand arrow + deck name */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${getDeckGradient(deck, deckIndex)} flex-shrink-0`} />
                  <i className={`fa-solid fa-chevron-right text-[10px] text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                      {deck.name}
                    </p>
                    {deck.isCollab && (
                      <span className="text-[10px] text-indigo-500">Shared</span>
                    )}
                  </div>
                </div>

                {/* Stats columns */}
                {stats ? (
                  <>
                    <span className={`w-14 text-center text-sm font-semibold ${stats.newCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600"}`}>
                      {stats.newCount}
                    </span>
                    <span className={`w-14 text-center text-sm font-semibold ${stats.learningCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-300 dark:text-gray-600"}`}>
                      {stats.learningCount}
                    </span>
                    <span className={`w-14 text-center text-sm font-semibold ${stats.reviewCount > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-600"}`}>
                      {stats.reviewCount}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-14 text-center text-xs text-gray-400 dark:text-gray-500">{deck.cardCount || 0}</span>
                    <span className="w-14 text-center text-xs text-gray-400 dark:text-gray-500">—</span>
                    <span className="w-14 text-center text-xs text-gray-400 dark:text-gray-500">—</span>
                  </>
                )}
              </div>

              {/* Expanded: category breakdown + study button */}
              {isExpanded && (
                <div className="bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/50">
                  {/* Category sub-rows */}
                  {hasCategories && categoryStats.map(cat => (
                    <div key={cat.name} className="flex items-center px-4 py-2 pl-10">
                      <span className="flex-1 text-xs text-gray-600 dark:text-gray-400 truncate">{cat.name}</span>
                      <span className={`w-14 text-center text-xs ${cat.newCount > 0 ? "text-blue-500" : "text-gray-300 dark:text-gray-600"}`}>{cat.newCount}</span>
                      <span className={`w-14 text-center text-xs ${cat.learningCount > 0 ? "text-orange-500" : "text-gray-300 dark:text-gray-600"}`}>{cat.learningCount}</span>
                      <span className={`w-14 text-center text-xs ${cat.reviewCount > 0 ? "text-green-500" : "text-gray-300 dark:text-gray-600"}`}>{cat.reviewCount}</span>
                    </div>
                  ))}

                  {/* Study button */}
                  {stats && (stats.reviewCount > 0 || stats.learningCount > 0 || stats.newCount > 0) && (
                    <div className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); onStartStudy(deck.id); }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-play text-xs" />
                        Study Now
                      </button>
                    </div>
                  )}

                  {!stats && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Tap to load this deck</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {decks.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No decks yet. Create one in the Deck Library.</p>
          </div>
        )}
      </div>

      {/* Activity toggle */}
      <button
        onClick={() => setShowActivity(!showActivity)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-chart-line text-xs" />
          Study Activity
        </span>
        <i className={`fa-solid fa-chevron-${showActivity ? "up" : "down"} text-xs`} />
      </button>

      {showActivity && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <ActivityCalendar activity={activity} streak={streak} />
        </div>
      )}
    </div>
  );
}
