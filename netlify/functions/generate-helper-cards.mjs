import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { card } = await req.json();

    if (!card?.front || !card?.back) {
      return Response.json({ error: "Card data required" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `You are a study tutor. A student is struggling with a flashcard. Generate 2-3 simpler prerequisite cards that build up to understanding the difficult concept.

Rules:
- Each card should cover a foundational concept needed to understand the main card
- Start with the most basic prerequisite and build up
- Use a mix of question styles (definitions, gap-fills, simple applications)
- Keep questions and answers concise
- Return ONLY a JSON array of objects with "front", "back", "category", "difficulty" fields
- Set difficulty to "easy" for prerequisites`,
      messages: [
        {
          role: "user",
          content: `This card is difficult for the student:\nQ: ${card.front}\nA: ${card.back}\nCategory: ${card.category || "General"}\n\nGenerate 2-3 simpler prerequisite cards that build up to this concept.`,
        },
      ],
    });

    const text = message.content[0].text;
    let cards;
    try {
      cards = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) cards = JSON.parse(match[0]);
    }

    if (cards && cards.length > 0) {
      // Add IDs and mark as helper cards
      const helpers = cards.map((c, i) => ({
        id: `helper-${Date.now()}-${i}`,
        front: c.front,
        back: c.back,
        category: c.category || card.category || "General",
        difficulty: "easy",
        helperFor: card.id,
        isHelper: true,
      }));
      return Response.json({ cards: helpers });
    }

    return Response.json({ cards: [] });

  } catch (error) {
    console.error("Generate helper cards error:", error);
    return Response.json({ cards: [] });
  }
};
