import { createEmptyCard, fsrs, generatorParameters, Rating } from "ts-fsrs";

export function cardKey(card) {
  return card.front.slice(0, 60);
}

// Default FSRS instance (used by helper functions outside component)
const defaultF = fsrs(generatorParameters());

export function createFSRS(params, retention) {
  const p = params ? { ...generatorParameters(), ...params } : generatorParameters();
  if (retention) p.request_retention = retention;
  return fsrs(p);
}

/**
 * Get the FSRS card object from progress, creating a new one if needed.
 * Handles backward compatibility with old SM-2 data.
 */
export function getFSRSCard(prog) {
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
export function formatDue(dueDate, now = new Date()) {
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
 */
export function projectedIntervals(prog, fsrsInstance) {
  const inst = fsrsInstance || defaultF;
  const card = getFSRSCard(prog);
  const now = new Date();
  const scheduling = inst.repeat(card, now);
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
export function isDueOrNew(prog) {
  if (!prog || !prog.fsrs) return true; // new card
  const card = getFSRSCard(prog);
  return card.due <= new Date();
}

export function isNewCard(prog) {
  if (!prog || !prog.fsrs) return true;
  return prog.fsrs.state === 0;
}

export function isLearning(prog) {
  if (!prog || !prog.fsrs) return false;
  return prog.fsrs.state === 1 || prog.fsrs.state === 3;
}

/**
 * Build study pool based on FSRS scheduling.
 * Pure function — extracted from StudyMode's useCallback.
 */
export function buildPool(allCards, prog, size, newCardMix = 0) {
  const now = new Date();

  const learningCards = [];
  const dueCards = [];
  const newCards = [];

  allCards.forEach((c) => {
    const p = prog[cardKey(c)];
    // Skip suspended cards
    if (p?.suspended) return;
    if (isNewCard(p)) {
      newCards.push(c);
    } else if (isLearning(p)) {
      const card = getFSRSCard(p);
      if (card.due <= now) {
        learningCards.push({ card: c, dueDate: card.due });
      }
    } else {
      const card = getFSRSCard(p);
      if (card.due <= now) {
        dueCards.push({ card: c, dueDate: card.due });
      }
    }
  });

  // Sort due cards oldest first
  learningCards.sort((a, b) => a.dueDate - b.dueDate);
  dueCards.sort((a, b) => a.dueDate - b.dueDate);

  // If user set a new card mix %, interleave new cards proportionally
  if (newCardMix > 0 && size > 0 && newCards.length > 0) {
    const newSlots = Math.max(1, Math.round(size * newCardMix / 100));
    const reviewSlots = size - newSlots;

    const reviewPool = [
      ...learningCards.map(d => d.card),
      ...dueCards.map(d => d.card),
    ].slice(0, reviewSlots);

    const newPool = newCards.slice(0, newSlots);

    const result = [];
    let ri = 0, ni = 0;
    const interval = newPool.length > 0 ? Math.max(1, Math.floor(size / newPool.length)) : size;
    for (let i = 0; i < size && (ri < reviewPool.length || ni < newPool.length); i++) {
      if (ni < newPool.length && i > 0 && i % interval === 0) {
        result.push(newPool[ni++]);
      } else if (ri < reviewPool.length) {
        result.push(reviewPool[ri++]);
      } else if (ni < newPool.length) {
        result.push(newPool[ni++]);
      }
    }
    return result;
  }

  const ordered = [
    ...learningCards.map((d) => d.card),
    ...dueCards.map((d) => d.card),
    ...newCards,
  ];

  if (size > 0) {
    return ordered.slice(0, size);
  }
  return ordered;
}
