import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { content, category, existingTopics, density } = await req.json();

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const densityInstruction = density === "concise"
      ? "\nDENSITY: Focus only on the most important, high-yield concepts. Be selective — quality over quantity. Only create cards for key definitions, critical processes, and must-know facts.\n"
      : density === "comprehensive"
      ? "\nDENSITY: Extract everything worth studying. Be thorough — cover every definition, process, comparison, example, and application. Leave nothing out.\n"
      : "";

    const systemPrompt = `You are an expert tutor creating flashcards from study material.
Generate flashcards as a JSON array. Each flashcard should have:
- "front": A clear, concise question or prompt (1-2 sentences max)
- "back": A comprehensive but concise answer (2-4 sentences max)
- "category": The subject area this belongs to (e.g., "Biology", "Chemistry", "Music Theory", "Economics", "Nursing", "Psychology", etc.)
- "difficulty": One of: "easy", "medium", "hard"

CARD TYPE MIX — Adapt question styles to the subject matter:

For MEDICAL/NURSING/BIOLOGY content, emphasize:
- Clinical scenarios: "A patient presents with X. What is the most likely diagnosis?"
- Mechanism: "What is the mechanism by which X causes Y?"
- Gap fill: "_____ is the enzyme that catalyzes..."
- Drug/treatment: "What is the first-line treatment for X?"
- Differential: "How do you distinguish X from Y?"
Mix: 35% clinical/applied, 30% gap fill, 20% mechanism, 15% direct

For MATH/PHYSICS/CHEMISTRY content, emphasize:
- Problem setup: "Given X, calculate/determine Y"
- Conceptual: "Why does X happen in terms of Y?"
- Gap fill: "The formula for X is ______"
- Compare: "How does X differ from Y?"
Mix: 30% problem/calculation, 30% conceptual, 25% gap fill, 15% compare

For HUMANITIES/HISTORY/LAW content, emphasize:
- Cause/effect: "What led to X?" / "What was the result of Y?"
- Significance: "Why is X significant?"
- Compare: "How did X differ from Y?"
- Gap fill: "The _____ of 1776 established..."
Mix: 30% cause/effect, 25% significance, 25% gap fill, 20% compare

For all other subjects, use a balanced mix:
- 30% gap fill, 30% application, 40% direct concept questions

Rules:
- Create 1 flashcard per distinct concept/fact in the content
- NEVER create duplicate or near-duplicate cards — each card must test a unique concept
- Questions should test understanding, not just recall
- For gap-fill cards, put "______" in the front where the key term goes, and the answer is the missing term plus context
- For processes, ask about steps and mechanisms
- For comparisons, highlight the differences
- Handle special characters (musical notation, math symbols, etc.) naturally
${category ? `- Focus only on content related to: ${category}` : ""}
${existingTopics ? `- IMPORTANT: These topics have ALREADY been covered in other cards. Do NOT create cards about them: ${existingTopics}` : ""}
${densityInstruction}
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
