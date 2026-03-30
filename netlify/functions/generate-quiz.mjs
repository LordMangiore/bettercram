import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function contentHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function cardQuizKey(card) {
  return `qbank-${contentHash(`${card.front}:${card.back}`)}`;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { cards, deckName, batchIndex } = await req.json();

    if (!cards || cards.length === 0) {
      return Response.json({ error: "No cards provided" }, { status: 400 });
    }

    const store = getStore("question-bank");
    const subject = deckName || cards[0]?.category || "academic studies";

    // Step 1: Check which cards already have cached questions
    const cached = [];
    const needsGeneration = [];

    for (const card of cards) {
      const key = cardQuizKey(card);
      try {
        const existing = await store.get(key, { type: "json" });
        if (existing?.questions?.length > 0) {
          // Pick a random question from the bank for variety
          const q = existing.questions[Math.floor(Math.random() * existing.questions.length)];
          cached.push({ ...q, cardKey: `${card.front.slice(0, 60)}`, fromCache: true });
        } else {
          needsGeneration.push(card);
        }
      } catch {
        needsGeneration.push(card);
      }
    }

    // Step 2: Generate questions for uncached cards (max 10 per call — frontend batches the rest)
    let generated = [];
    if (needsGeneration.length > 0) {
      const chunk = needsGeneration.slice(0, 10); // Process up to 10 per function call
      {
        const cardSummary = chunk
          .map((c, i) => `Card ${i + 1}:\nQ: ${c.front}\nA: ${c.back}`)
          .join("\n\n");

        try {
          const message = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4096,
            system: `You are an expert tutor creating multiple-choice quiz questions for ${subject}.
Given flashcard Q&A pairs, generate exactly 1 quiz question per card as a JSON array.
For each card, alternate between:
- Standard questions testing recall/understanding
- Harder questions testing application or deeper reasoning

Each question object must have:
- "cardIndex": Which card number (1-based) this question is for
- "question": The question text
- "options": Array of exactly 4 answer choices (strings)
- "correctIndex": Index (0-3) of the correct answer
- "explanation": Brief explanation of why the answer is correct
- "category": The subject category
- "difficulty": "standard" or "hard"

Rules:
- Make wrong answers plausible (common exam distractors)
- Test understanding, not just memorization
- Hard questions should require synthesis or application

Return ONLY valid JSON array, no other text.`,
            messages: [
              {
                role: "user",
                content: `Generate quiz questions from these ${subject} flashcards:\n\n${cardSummary}`,
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

          // Cache questions per card and collect for response
          for (const q of questions) {
            const cardIdx = (q.cardIndex || 1) - 1;
            const sourceCard = chunk[cardIdx] || chunk[0];
            const key = cardQuizKey(sourceCard);
            const cardKeyStr = `${sourceCard.front.slice(0, 60)}`;

            // Add to response
            generated.push({ ...q, cardKey: cardKeyStr, fromCache: false });

            // Cache: append to existing question bank for this card
            try {
              let existing = await store.get(key, { type: "json" }).catch(() => null);
              const bank = existing?.questions || [];
              // Don't duplicate — check if similar question exists
              const isDupe = bank.some(
                (b) => contentHash(b.question) === contentHash(q.question)
              );
              if (!isDupe) {
                bank.push({
                  question: q.question,
                  options: q.options,
                  correctIndex: q.correctIndex,
                  explanation: q.explanation,
                  category: q.category,
                  difficulty: q.difficulty || "standard",
                  createdAt: new Date().toISOString(),
                });
                await store.setJSON(key, {
                  questions: bank,
                  cardFront: sourceCard.front.slice(0, 100),
                  updatedAt: new Date().toISOString(),
                });
              }
            } catch {}
          }
        } catch (err) {
          console.error("Quiz generation error:", err);
        }
      }
    }

    // Step 3: Combine cached + generated, maintain order
    const allQuestions = [...cached, ...generated];

    return Response.json({
      questions: allQuestions,
      stats: {
        total: allQuestions.length,
        fromCache: cached.length,
        generated: generated.length,
        cardsProcessed: cards.length,
      },
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return Response.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/generate-quiz",
};
