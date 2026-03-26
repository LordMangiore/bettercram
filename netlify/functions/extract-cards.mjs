export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { url } = await req.json();
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!url) {
      return Response.json({ error: "No URL provided" }, { status: 400 });
    }

    // Use Firecrawl Extract to pull structured Q&A data
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["extract"],
        extract: {
          schema: {
            type: "object",
            properties: {
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: { type: "string", description: "The question or term" },
                    back: { type: "string", description: "The answer or definition" },
                    category: { type: "string", description: "Subject category" },
                  },
                  required: ["front", "back"],
                },
              },
            },
          },
          prompt: "Extract all flashcards, questions and answers, terms and definitions from this page. Each item should have a 'front' (question/term) and 'back' (answer/definition).",
        },
      }),
    });

    const data = await res.json();

    if (data.success && data.data?.extract?.flashcards?.length > 0) {
      const cards = data.data.extract.flashcards.map((card, i) => ({
        id: `extract-${Date.now()}-${i}`,
        front: card.front,
        back: card.back,
        category: card.category || "Extracted",
        difficulty: "medium",
      }));

      return Response.json({
        cards,
        source: url,
        status: "done",
      });
    }

    // Extraction didn't yield structured results
    return Response.json({
      error: "Could not extract structured flashcards from this page. Will fall back to regular generation.",
      cards: [],
      status: "fallback",
    }, { status: 200 });

  } catch (error) {
    console.error("Extract error:", error);
    return Response.json(
      { error: error.message || "Failed to extract cards" },
      { status: 500 }
    );
  }
};
