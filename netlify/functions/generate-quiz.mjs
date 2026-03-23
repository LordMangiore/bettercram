import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { cards } = await req.json();

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({ error: "No cards provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cardSummary = cards
      .slice(0, 10)
      .map((c) => `Q: ${c.front}\nA: ${c.back}`)
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `You are an expert MCAT tutor creating multiple-choice quiz questions.
Given flashcard Q&A pairs, generate quiz questions as a JSON array.
Each question should have:
- "question": The question text
- "options": Array of exactly 4 answer choices (strings)
- "correctIndex": Index (0-3) of the correct answer
- "explanation": Brief explanation of why the answer is correct
- "category": One of: "Psychology/Sociology", "Biology", "Biochemistry", "Physics", "Chemistry", "General"

Rules:
- Make wrong answers plausible (common MCAT distractors)
- Test understanding, not just memorization
- Vary question difficulty
- Generate 1 quiz question per flashcard provided

Return ONLY valid JSON array, no other text.`,
      messages: [
        {
          role: "user",
          content: `Generate multiple choice quiz questions from these flashcards:\n\n${cardSummary}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    let questions;
    try {
      questions = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse quiz JSON");
      }
    }

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate quiz" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/generate-quiz",
};
