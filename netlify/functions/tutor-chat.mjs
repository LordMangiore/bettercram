import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function makeCacheKey(card, action) {
  const raw = `${action}:${card.front.slice(0, 80)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `tutor-${Math.abs(hash).toString(36)}`;
}

async function getCache() {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore("tutor-cache");
  } catch {
    return null;
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { card, action, messages } = await req.json();

    // Cache explain and mnemonic (not chat)
    if (action === "explain" || action === "mnemonic") {
      const store = await getCache();
      if (store) {
        const key = makeCacheKey(card, action);
        try {
          const cached = await store.get(key, { type: "json" });
          if (cached) {
            return new Response(JSON.stringify(cached), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch {}
      }
    }

    let systemPrompt = `You are an expert MCAT tutor. You're helping a student study for the MCAT.
Be clear, concise, and use analogies when helpful. Always relate back to what's tested on the MCAT.
Format responses with markdown for readability.`;

    let userContent = "";

    if (action === "explain") {
      systemPrompt += `\n\nThe student wants a deep explanation of a concept from their flashcards.
Explain it thoroughly but accessibly:
- Start with the big picture (why does this matter for the MCAT?)
- Break down the mechanism/concept step by step
- Use a real-world analogy
- Highlight common MCAT traps and misconceptions
- End with 2-3 key takeaways to remember`;
      userContent = `Explain this concept in depth:\n\nQuestion: ${card.front}\nAnswer: ${card.back}\nCategory: ${card.category}`;
    } else if (action === "mnemonic") {
      systemPrompt += `\n\nCreate memorable mnemonics and memory tricks.
For each concept, provide:
- A catchy mnemonic or acronym
- A visual/story-based memory technique
- A one-line "elevator pitch" summary
Keep it fun and sticky — the weirder the better for memorization.`;
      userContent = `Create mnemonics to remember this:\n\nConcept: ${card.front}\nAnswer: ${card.back}`;
    } else if (action === "chat") {
      systemPrompt += `\n\nYou're having a conversation about this flashcard topic.
Answer questions, clarify confusion, and test understanding.
The flashcard context is:\nQuestion: ${card.front}\nAnswer: ${card.back}\nCategory: ${card.category}`;
    }

    const apiMessages = action === "chat" && messages?.length > 0
      ? messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: userContent }];

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: apiMessages,
    });

    const result = { response: message.content[0].text };

    // Cache the result for explain/mnemonic
    if (action === "explain" || action === "mnemonic") {
      const store = await getCache();
      if (store) {
        try {
          await store.setJSON(makeCacheKey(card, action), result);
        } catch {}
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tutor chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/tutor-chat",
};
