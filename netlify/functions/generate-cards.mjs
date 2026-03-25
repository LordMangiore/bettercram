import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { content, category } = await req.json();

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert tutor creating flashcards from study material.
Generate flashcards as a JSON array. Each flashcard should have:
- "front": A clear, concise question or prompt (1-2 sentences max)
- "back": A comprehensive but concise answer (2-4 sentences max)
- "category": The subject area this belongs to (e.g., "Biology", "Chemistry", "Music Theory", "Economics", "Nursing", "Psychology", etc.)
- "difficulty": One of: "easy", "medium", "hard"

Rules:
- Create 1 flashcard per distinct concept/fact in the content
- Questions should test understanding, not just recall
- Include key terms and their definitions
- For tables and lists, create cards that test knowledge of the data
- For processes, ask about steps and mechanisms
- For comparisons, highlight the differences
- Handle special characters (musical notation, math symbols, etc.) naturally
${category ? `- Focus only on content related to: ${category}` : ""}

Return ONLY a valid JSON array, no markdown fences, no other text. Start with [ and end with ].`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate flashcards from this study material:\n\n${content}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    let cards;
    try {
      cards = JSON.parse(responseText);
    } catch {
      // Try extracting JSON from markdown code fences
      const fenceMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        try {
          cards = JSON.parse(fenceMatch[1].trim());
        } catch {}
      }
      // Try finding raw JSON array
      if (!cards) {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            cards = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }
      if (!cards) {
        console.error("Failed to parse response:", responseText.slice(0, 500));
        cards = []; // Return empty instead of crashing
      }
    }

    return new Response(JSON.stringify({ cards }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating cards:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate cards" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/generate-cards",
};
