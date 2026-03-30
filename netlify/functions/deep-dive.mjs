import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getBlobStore(name) {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore(name);
  } catch {
    return null;
  }
}

function contentHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function makeCacheKey(card) {
  const raw = `deepdive:${card.front}:${card.back}`;
  return `dive-${contentHash(raw)}`;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { card, query, deckName } = await req.json();

    // Check cache (skip if blob store unavailable)
    const store = await getBlobStore("global-cache");
    const key = makeCacheKey(card);
    if (store) {
      try {
        const cached = await store.get(key, { type: "json" });
        if (cached) {
          // Check 30-day TTL
          const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
          if (cached.cachedAt && Date.now() - cached.cachedAt < THIRTY_DAYS) {
            return new Response(JSON.stringify(cached), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
      } catch {}
    }

    // Build a smart search query based on the card and deck
    const subject = card.category || deckName || "academic";
    const searchQuery = query || `${card.front} ${subject} site:edu OR site:nih.gov OR site:ncbi.nlm.nih.gov OR site:khanacademy.org`;

    // Use Firecrawl to search for authoritative sources
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        timeout: 15000,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    let webContent = "";
    let sources = [];

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.success && searchData.data) {
        // Use inline markdown from search results — no additional scraping needed
        for (const item of searchData.data) {
          if (item.markdown && item.markdown.length > 100) {
            webContent += `\n\nSource: ${item.title || item.url}\n${item.markdown.slice(0, 3000)}`;
            sources.push({ title: item.title || item.url, url: item.url });
          } else if (item.description) {
            // Use description as fallback context
            webContent += `\n\nSource: ${item.title || item.url}\n${item.description}`;
            sources.push({ title: item.title || item.url, url: item.url });
          }
        }
      }
    }

    const deckContext = deckName || card.category || "academic studies";

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2048,
      system: `You are an expert tutor synthesizing research to deepen a student's understanding of ${deckContext}.
Given a flashcard topic and web research, create a comprehensive but digestible deep dive.

Structure your response as:
## Overview
Brief context of why this topic matters for ${deckContext}.

## Key Details
The important details from the research, explained clearly.

## Real-World Application
How this concept applies in practice — real scenarios, clinical cases, or practical examples.

## Related Concepts
Other topics in ${deckContext} this connects to.

## Exam Insight
A tricky exam-style question or common misconception about this topic that students should watch out for.

Use markdown formatting. Be thorough but concise. Cite sources when available.`,
      messages: [
        {
          role: "user",
          content: `Deep dive into this flashcard topic using the research provided:

Flashcard Question: ${card.front}
Flashcard Answer: ${card.back}
Category: ${card.category}
Deck: ${deckName || "N/A"}

${webContent ? `Web Research:\n${webContent}` : "No web research available — use your knowledge."}`,
        },
      ],
    });

    const result = {
      content: message.content[0].text,
      sources,
      cachedAt: Date.now(),
    };

    // Cache result (skip if store unavailable)
    if (store) {
      try {
        await store.setJSON(key, result);
      } catch {}
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Deep dive error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to research topic" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/deep-dive",
};
