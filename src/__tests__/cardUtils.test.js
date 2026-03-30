import { describe, it, expect } from "vitest";
import { ensureCardIds } from "../lib/cardUtils";

describe("ensureCardIds", () => {
  it("preserves existing IDs", () => {
    const cards = [{ id: "existing-id", front: "Q1", back: "A1" }];
    const result = ensureCardIds(cards);
    expect(result[0].id).toBe("existing-id");
  });

  it("generates IDs for cards without them", () => {
    const cards = [{ front: "What is DNA?", back: "A molecule" }];
    const result = ensureCardIds(cards);
    expect(result[0].id).toBeDefined();
    expect(result[0].id).toContain("gen-0-");
  });

  it("includes front text in generated ID", () => {
    const cards = [{ front: "Mitochondria", back: "Powerhouse" }];
    const result = ensureCardIds(cards);
    expect(result[0].id).toContain("Mitochondria");
  });

  it("strips non-word characters from generated ID", () => {
    const cards = [{ front: "What's the pH of blood?", back: "7.4" }];
    const result = ensureCardIds(cards);
    expect(result[0].id).not.toContain("?");
    expect(result[0].id).not.toContain("'");
  });

  it("truncates front text in ID to 20 chars", () => {
    const cards = [{ front: "A very long question that goes on and on", back: "Answer" }];
    const result = ensureCardIds(cards);
    // gen-0- prefix + up to 20 chars of front (stripped)
    const idPart = result[0].id.replace("gen-0-", "");
    expect(idPart.length).toBeLessThanOrEqual(20);
  });

  it("handles empty front gracefully", () => {
    const cards = [{ front: "", back: "Answer" }];
    const result = ensureCardIds(cards);
    expect(result[0].id).toBe("gen-0-");
  });

  it("handles undefined front gracefully", () => {
    const cards = [{ back: "Answer" }];
    const result = ensureCardIds(cards);
    expect(result[0].id).toBe("gen-0-");
  });

  it("is idempotent — running twice doesn't change IDs", () => {
    const cards = [{ front: "Q1", back: "A1" }];
    const first = ensureCardIds(cards);
    const second = ensureCardIds(first);
    expect(second[0].id).toBe(first[0].id);
  });

  it("generates unique IDs for different positions", () => {
    const cards = [
      { front: "Same question", back: "A1" },
      { front: "Same question", back: "A2" },
    ];
    const result = ensureCardIds(cards);
    expect(result[0].id).not.toBe(result[1].id); // different index
  });

  it("preserves all other card properties", () => {
    const cards = [{ front: "Q", back: "A", category: "Bio", difficulty: "hard" }];
    const result = ensureCardIds(cards);
    expect(result[0].category).toBe("Bio");
    expect(result[0].difficulty).toBe("hard");
    expect(result[0].front).toBe("Q");
  });
});
