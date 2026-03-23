import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { existingCards, content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Summarize existing cards to avoid duplicates
    const existingSummary = (existingCards || [])
      .slice(0, 100)
      .map((c) => c.front)
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are an expert MCAT tutor creating ADDITIONAL flashcards to fill gaps in an existing set.
Generate flashcards as a JSON array. Each flashcard should have:
- "front": A clear question or prompt
- "back": A concise answer (2-4 sentences)
- "category": One of: "Psychology/Sociology", "Biology", "Biochemistry", "Physics", "Chemistry", "General"
- "difficulty": One of: "easy", "medium", "hard"

Focus on:
1. Concepts NOT already covered in the existing cards
2. "What is the DIFFERENCE between X and Y?" comparison cards
3. "If a patient presents with X, what would you expect?" application cards
4. Common MCAT trap questions and misconceptions
5. Cross-topic connections

DO NOT duplicate any existing questions. Return ONLY valid JSON array.`,
      messages: [
        {
          role: "user",
          content: `Here are existing card questions (DO NOT repeat these):\n${existingSummary}\n\n---\n\nGenerate NEW cards from this study material:\n${content.slice(0, 6000)}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    let cards;
    try {
      cards = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\[[\s\S]*\]/);
      cards = match ? JSON.parse(match[0]) : [];
    }

    return new Response(JSON.stringify({ cards }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate more error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate more cards" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/generate-more",
};
