import { describe, it, expect, vi } from "vitest";
import { cardKey, getFSRSCard, formatDue, isDueOrNew, isNewCard, isLearning, buildPool } from "../../lib/fsrsHelpers";

describe("cardKey", () => {
  it("returns first 60 chars of front", () => {
    expect(cardKey({ front: "Short question" })).toBe("Short question");
  });

  it("truncates at 60 characters", () => {
    const long = "A".repeat(100);
    expect(cardKey({ front: long })).toHaveLength(60);
  });
});

describe("getFSRSCard", () => {
  it("rehydrates dates from JSON strings", () => {
    const prog = {
      fsrs: {
        due: "2026-04-01T00:00:00.000Z",
        last_review: "2026-03-30T12:00:00.000Z",
        state: 2, reps: 5, lapses: 1,
      },
    };
    const card = getFSRSCard(prog);
    expect(card.due).toBeInstanceOf(Date);
    expect(card.last_review).toBeInstanceOf(Date);
    expect(card.state).toBe(2);
  });

  it("creates empty card when no FSRS data", () => {
    const card = getFSRSCard(null);
    expect(card.due).toBeInstanceOf(Date);
    expect(card.reps).toBe(0);
  });

  it("creates empty card when prog has no fsrs field", () => {
    const card = getFSRSCard({ someOldField: true });
    expect(card.reps).toBe(0);
  });

  it("handles missing last_review", () => {
    const prog = { fsrs: { due: "2026-04-01T00:00:00.000Z", state: 0, reps: 0 } };
    const card = getFSRSCard(prog);
    expect(card.last_review).toBeUndefined();
  });
});

describe("formatDue", () => {
  const now = new Date("2026-03-30T12:00:00.000Z");

  it("shows < 1m for times less than a minute away", () => {
    const due = new Date(now.getTime() + 20000); // 20 seconds
    expect(formatDue(due, now)).toBe("< 1m");
  });

  it("shows minutes for short durations", () => {
    const due = new Date(now.getTime() + 15 * 60000); // 15 min
    expect(formatDue(due, now)).toBe("15m");
  });

  it("shows hours for medium durations", () => {
    const due = new Date(now.getTime() + 5 * 3600000); // 5 hours
    expect(formatDue(due, now)).toBe("5h");
  });

  it("shows days for multi-day durations", () => {
    const due = new Date(now.getTime() + 3 * 86400000); // 3 days
    expect(formatDue(due, now)).toBe("3d");
  });

  it("shows weeks for 7-29 day durations", () => {
    const due = new Date(now.getTime() + 14 * 86400000); // 14 days
    expect(formatDue(due, now)).toBe("2w");
  });

  it("shows months for 30+ day durations", () => {
    const due = new Date(now.getTime() + 60 * 86400000); // 60 days
    expect(formatDue(due, now)).toBe("2mo");
  });
});

describe("isDueOrNew", () => {
  it("returns true for null progress (new card)", () => {
    expect(isDueOrNew(null)).toBe(true);
  });

  it("returns true for card with no fsrs data", () => {
    expect(isDueOrNew({})).toBe(true);
  });

  it("returns true for overdue card", () => {
    const prog = { fsrs: { due: new Date(Date.now() - 86400000).toISOString(), state: 2, reps: 5 } };
    expect(isDueOrNew(prog)).toBe(true);
  });

  it("returns false for card not yet due", () => {
    const prog = { fsrs: { due: new Date(Date.now() + 86400000).toISOString(), state: 2, reps: 5 } };
    expect(isDueOrNew(prog)).toBe(false);
  });
});

describe("isNewCard / isLearning", () => {
  it("isNewCard returns true for null/undefined progress", () => {
    expect(isNewCard(null)).toBe(true);
    expect(isNewCard(undefined)).toBe(true);
  });

  it("isNewCard returns true for state 0", () => {
    expect(isNewCard({ fsrs: { state: 0 } })).toBe(true);
  });

  it("isNewCard returns false for review state", () => {
    expect(isNewCard({ fsrs: { state: 2 } })).toBe(false);
  });

  it("isLearning returns true for state 1 (learning)", () => {
    expect(isLearning({ fsrs: { state: 1 } })).toBe(true);
  });

  it("isLearning returns true for state 3 (relearning)", () => {
    expect(isLearning({ fsrs: { state: 3 } })).toBe(true);
  });

  it("isLearning returns false for new or review cards", () => {
    expect(isLearning(null)).toBe(false);
    expect(isLearning({ fsrs: { state: 0 } })).toBe(false);
    expect(isLearning({ fsrs: { state: 2 } })).toBe(false);
  });
});

describe("buildPool", () => {
  const makeCard = (front) => ({ front, back: "answer" });
  const now = new Date();
  const pastDue = new Date(now.getTime() - 3600000).toISOString();
  const futureDue = new Date(now.getTime() + 86400000).toISOString();

  it("includes new cards (no progress)", () => {
    const cards = [makeCard("New card 1"), makeCard("New card 2")];
    const pool = buildPool(cards, {}, 10);
    expect(pool).toHaveLength(2);
  });

  it("includes due review cards", () => {
    const cards = [makeCard("Review card")];
    const progress = {
      "Review card": { fsrs: { state: 2, reps: 5, due: pastDue, last_review: pastDue } },
    };
    const pool = buildPool(cards, progress, 10);
    expect(pool).toHaveLength(1);
  });

  it("excludes not-yet-due review cards", () => {
    const cards = [makeCard("Future card")];
    const progress = {
      "Future card": { fsrs: { state: 2, reps: 5, due: futureDue, last_review: pastDue } },
    };
    const pool = buildPool(cards, progress, 10);
    expect(pool).toHaveLength(0);
  });

  it("excludes suspended cards", () => {
    const cards = [makeCard("Suspended"), makeCard("Active")];
    const progress = {
      Suspended: { suspended: true },
    };
    const pool = buildPool(cards, progress, 10);
    expect(pool).toHaveLength(1);
    expect(pool[0].front).toBe("Active");
  });

  it("respects session size limit", () => {
    const cards = Array.from({ length: 50 }, (_, i) => makeCard(`Card ${i}`));
    const pool = buildPool(cards, {}, 10);
    expect(pool).toHaveLength(10);
  });

  it("size 0 returns all cards", () => {
    const cards = Array.from({ length: 5 }, (_, i) => makeCard(`Card ${i}`));
    const pool = buildPool(cards, {}, 0);
    expect(pool).toHaveLength(5);
  });

  it("orders: learning first, then review, then new", () => {
    const cards = [makeCard("New"), makeCard("Learning"), makeCard("Review")];
    const progress = {
      Learning: { fsrs: { state: 1, reps: 2, due: pastDue, last_review: pastDue } },
      Review: { fsrs: { state: 2, reps: 10, due: pastDue, last_review: pastDue } },
    };
    const pool = buildPool(cards, progress, 10);
    expect(pool[0].front).toBe("Learning");
    expect(pool[1].front).toBe("Review");
    expect(pool[2].front).toBe("New");
  });

  it("interleaves new cards when newCardMix is set", () => {
    const cards = [
      makeCard("Review 1"), makeCard("Review 2"), makeCard("Review 3"),
      makeCard("New 1"), makeCard("New 2"),
    ];
    const progress = {
      "Review 1": { fsrs: { state: 2, reps: 10, due: pastDue, last_review: pastDue } },
      "Review 2": { fsrs: { state: 2, reps: 10, due: pastDue, last_review: pastDue } },
      "Review 3": { fsrs: { state: 2, reps: 10, due: pastDue, last_review: pastDue } },
    };
    const pool = buildPool(cards, progress, 5, 40); // 40% new
    // Should have a mix of review and new cards
    const newInPool = pool.filter(c => c.front.startsWith("New"));
    const reviewInPool = pool.filter(c => c.front.startsWith("Review"));
    expect(newInPool.length).toBeGreaterThan(0);
    expect(reviewInPool.length).toBeGreaterThan(0);
  });
});
