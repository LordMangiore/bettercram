import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { card, style } = await req.json();

    if (!card?.front || !card?.back) {
      return Response.json({ error: "Card data required" }, { status: 400 });
    }

    const styleInstructions = {
      "gap-fill": "Rewrite as a gap-fill/cloze card. Put '______' where the key term goes on the front. The answer should be the missing term plus brief context.",
      "clinical": "Rewrite as a clinical scenario. The front should present a patient case or real-world situation. The answer explains the reasoning.",
      "compare": "Rewrite as a comparison question. Ask how this concept differs from a related one.",
      "deeper": "Rewrite to test deeper understanding. Ask WHY or HOW, not just WHAT. The answer should explain the mechanism or reasoning.",
      "simpler": "Rewrite to be simpler and more approachable. Break down complex ideas into a clearer question.",
      "default": "Rewrite this card to be a better, more engaging study question. Vary the style from the original.",
    };

    const instruction = styleInstructions[style] || styleInstructions.default;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: `You rewrite flashcards to be more effective for studying. Return ONLY a JSON object with "front" and "back" fields. No markdown, no explanation.`,
      messages: [
        {
          role: "user",
          content: `${instruction}\n\nOriginal card:\nQ: ${card.front}\nA: ${card.back}\n\nCategory: ${card.category || "General"}`,
        },
      ],
    });

    const text = message.content[0].text;
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    if (result?.front && result?.back) {
      return Response.json({
        front: result.front,
        back: result.back,
        category: card.category,
        difficulty: card.difficulty,
      });
    }

    return Response.json({ error: "Failed to regenerate" }, { status: 422 });

  } catch (error) {
    console.error("Regen card error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
};
