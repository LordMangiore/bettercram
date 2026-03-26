import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { cards } = await req.json();

    if (!cards || cards.length === 0) {
      return Response.json({ cards: [] });
    }

    // Build a compact representation for Claude to analyze
    const cardSummaries = cards.map((c, i) => `[${i}] Q: ${c.front.slice(0, 100)} | A: ${c.back.slice(0, 80)}`).join("\n");

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: `You are a flashcard quality reviewer. Analyze the flashcards and return a JSON object with:
- "remove": array of indices to remove (duplicates, near-duplicates, or low-quality cards)
- "improvements": array of { "index": number, "front": string, "back": string } for cards that should be rewritten to be better

Rules for removal:
- Remove cards that test the SAME concept as another card (keep the better version)
- Remove cards that are too vague or trivial ("What is biology?")
- Remove cards where the answer just restates the question

Rules for improvement:
- Only improve cards that are mediocre but salvageable
- Make questions more specific and testable
- Convert bland "What is X?" cards into gap-fills or application questions where appropriate
- Keep improvements concise

Return ONLY valid JSON, no markdown fences. Example: {"remove": [3, 7, 12], "improvements": [{"index": 5, "front": "improved question", "back": "improved answer"}]}`,
      messages: [
        {
          role: "user",
          content: `Review these ${cards.length} flashcards for duplicates and quality:\n\n${cardSummaries}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    let review;
    try {
      review = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { review = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    if (!review) {
      // If parsing fails, return cards as-is
      return Response.json({ cards, removed: 0, improved: 0 });
    }

    // Apply removals
    const removeSet = new Set(review.remove || []);
    let scored = cards.filter((_, i) => !removeSet.has(i));

    // Apply improvements
    const improvementMap = new Map();
    for (const imp of (review.improvements || [])) {
      if (!removeSet.has(imp.index)) {
        improvementMap.set(imp.index, imp);
      }
    }

    scored = cards
      .map((card, i) => {
        if (removeSet.has(i)) return null;
        const imp = improvementMap.get(i);
        if (imp) {
          return { ...card, front: imp.front || card.front, back: imp.back || card.back };
        }
        return card;
      })
      .filter(Boolean);

    return Response.json({
      cards: scored,
      removed: removeSet.size,
      improved: improvementMap.size,
    });

  } catch (error) {
    console.error("Score cards error:", error);
    // On error, return original cards
    const { cards } = await req.clone().json().catch(() => ({ cards: [] }));
    return Response.json({ cards, removed: 0, improved: 0 });
  }
};
