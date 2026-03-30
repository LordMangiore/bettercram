import { describe, it, expect, vi } from "vitest";
import { computeExperienceWeight, generateEmpathyPrompt, getTimeContext, buildEmpathyContext } from "../empathyEngine";

// Helper: create card with front text
const card = (front) => ({ front, back: "answer" });

// Helper: create FSRS progress entry
const prog = (overrides = {}) => ({
  fsrs: {
    state: 2, reps: 5, lapses: 1, stability: 10, difficulty: 5,
    due: new Date().toISOString(),
    last_review: new Date().toISOString(),
    scheduled_days: 10,
    ...overrides,
  },
});

describe("computeExperienceWeight", () => {
  it("returns high EW + nurture for brand new student with no progress", () => {
    const cards = [card("What is mitosis?"), card("What is meiosis?")];
    const result = computeExperienceWeight(cards, {});

    expect(result.parameters.P).toBe(100); // all cards unseen = max novelty
    expect(result.parameters.S).toBe(0.1); // no data = lowest competence
    expect(result.parameters.R).toBe(1); // no data = lowest aptitude
    expect(result.mode).toBe("nurture");
  });

  it("returns low EW + challenge for experienced student with mature cards", () => {
    const cards = [card("What is mitosis?"), card("What is meiosis?")];
    const progress = {};
    cards.forEach((c) => {
      const key = c.front.slice(0, 60);
      progress[key] = prog({
        state: 2, reps: 50, lapses: 2, scheduled_days: 30,
        last_review: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      });
    });

    const result = computeExperienceWeight(cards, progress);

    expect(result.parameters.P).toBeLessThanOrEqual(20); // familiar
    expect(result.parameters.S).toBeGreaterThan(1.5); // high competence
    expect(result.experienceWeight).toBeLessThan(1);
    expect(["push", "challenge"]).toContain(result.mode);
  });

  it("frustration override: forces nurture when frustration > 0.6", () => {
    const cards = [card("Hard question")];
    const progress = {};
    const key = cards[0].front.slice(0, 60);
    progress[key] = prog({ state: 2, reps: 30, lapses: 2 });

    const session = { reviewed: 10, correct: 3, again: 7, streak: 0 };
    const result = computeExperienceWeight(cards, progress, session);

    expect(result.mode).toBe("nurture");
  });

  it("streak override: forces challenge when on hot streak", () => {
    const cards = [card("Easy question")];
    const progress = {};
    const key = cards[0].front.slice(0, 60);
    progress[key] = prog({ state: 1, reps: 3, lapses: 0 }); // learning state

    const session = { reviewed: 15, correct: 14, again: 0, streak: 10 };
    const result = computeExperienceWeight(cards, progress, session);

    expect(result.mode).toBe("challenge");
  });

  it("returns balanced mode for moderate progress", () => {
    const cards = [card("Q1"), card("Q2"), card("Q3")];
    const progress = {};
    cards.forEach((c) => {
      const key = c.front.slice(0, 60);
      progress[key] = prog({
        state: 2, reps: 10, lapses: 3,
        last_review: new Date(Date.now() - 3600000).toISOString(),
      });
    });

    const result = computeExperienceWeight(cards, progress);
    expect(["balanced", "support"]).toContain(result.mode);
  });

  it("handles empty cards array", () => {
    const result = computeExperienceWeight([], {});
    expect(result.parameters.P).toBe(50); // neutral default
    expect(result.mode).toBeDefined();
  });

  it("session modifiers: frustration amplifies EW, streak dampens it", () => {
    const cards = [card("Q1")];
    const progress = {};

    const baseLine = computeExperienceWeight(cards, progress, null);
    const frustrated = computeExperienceWeight(cards, progress, { reviewed: 10, correct: 2, again: 8, streak: 0 });
    const streaking = computeExperienceWeight(cards, progress, { reviewed: 10, correct: 10, again: 0, streak: 10 });

    expect(frustrated.experienceWeight).toBeGreaterThan(baseLine.experienceWeight);
    expect(streaking.experienceWeight).toBeLessThan(baseLine.experienceWeight);
  });
});

describe("generateEmpathyPrompt", () => {
  it("returns a string containing the mode and parameters", () => {
    const state = {
      experienceWeight: 3.5,
      mode: "support",
      parameters: { P: 70, D: 0.8, A: 5, S: 0.6, R: 3 },
      session: { streakHeat: 0.2, frustration: 0.3, momentum: 0.5 },
    };

    const prompt = generateEmpathyPrompt(state);
    expect(prompt).toContain("SUPPORT");
    expect(prompt).toContain("Novelty(P)=70");
    expect(prompt).toContain("EMPATHY ENGINE");
  });

  it("generates different content for each mode", () => {
    const base = { parameters: { P: 50, D: 0.5, A: 10, S: 1.0, R: 5 }, session: { streakHeat: 0.5, frustration: 0.1, momentum: 0.6 } };

    const nurture = generateEmpathyPrompt({ ...base, experienceWeight: 10, mode: "nurture" });
    const challenge = generateEmpathyPrompt({ ...base, experienceWeight: 0.05, mode: "challenge" });

    expect(nurture).toContain("they don't leave");
    expect(challenge).toContain("Throw the hardest");
    expect(nurture).not.toEqual(challenge);
  });
});

describe("getTimeContext", () => {
  it("returns late night message for midnight hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 2, 0, 0)); // 2am
    expect(getTimeContext()).toContain("middle of the night");
    vi.useRealTimers();
  });

  it("returns early morning message for 7am", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 7, 0, 0));
    expect(getTimeContext()).toContain("Early morning");
    vi.useRealTimers();
  });

  it("returns late evening message for 10pm", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 22, 0, 0));
    expect(getTimeContext()).toContain("late");
    vi.useRealTimers();
  });

  it("returns empty string during normal hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 14, 0, 0)); // 2pm
    expect(getTimeContext()).toBe("");
    vi.useRealTimers();
  });
});

describe("buildEmpathyContext", () => {
  const state = {
    experienceWeight: 1.5,
    mode: "balanced",
    parameters: { P: 50, D: 0.5, A: 10, S: 1.0, R: 5 },
    session: { streakHeat: 0.3, frustration: 0.2, momentum: 0.6 },
  };

  it("uses observer brief when provided", () => {
    const result = buildEmpathyContext(state, "This student is struggling with organic chemistry.");
    expect(result).toContain("OBSERVER'S BRIEF");
    expect(result).toContain("organic chemistry");
  });

  it("falls back to static prompt when no observer brief", () => {
    const result = buildEmpathyContext(state, null);
    expect(result).toContain("EMPATHY ENGINE");
    expect(result).toContain("BALANCED");
  });
});
