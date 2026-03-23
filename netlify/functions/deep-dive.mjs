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

function makeCacheKey(card) {
  const raw = `deepdive:${card.front.slice(0, 80)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `dive-${Math.abs(hash).toString(36)}`;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { card, query } = await req.json();

    // Check cache (skip if blob store unavailable)
    const store = await getBlobStore("deepdive-cache");
    const key = makeCacheKey(card);
    if (store) {
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

    const searchQuery = query || `${card.front} ${card.category} MCAT`;

    // Use Firecrawl to search
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
      }),
    });

    let webContent = "";
    let sources = [];

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.success && searchData.data) {
        // Search gives us URLs — scrape the top 2 for content
        const urlsToScrape = searchData.data.slice(0, 2);
        const scrapeResults = await Promise.allSettled(
          urlsToScrape.map(async (item) => {
            const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
              },
              body: JSON.stringify({ url: item.url, formats: ["markdown"] }),
            });
            if (!scrapeRes.ok) return null;
            const scrapeData = await scrapeRes.json();
            return {
              title: item.title || item.url,
              url: item.url,
              markdown: scrapeData.data?.markdown || "",
            };
          })
        );

        for (const r of scrapeResults) {
          const result = r.status === "fulfilled" ? r.value : null;
          if (result && result.markdown) {
            webContent += `\n\nSource: ${result.title}\n${result.markdown.slice(0, 2000)}`;
            sources.push({ title: result.title, url: result.url });
          }
        }

        // Also add search descriptions for any remaining results
        for (const result of searchData.data) {
          if (result.description && !sources.find((s) => s.url === result.url)) {
            sources.push({
              title: result.title || result.url,
              url: result.url,
            });
          }
        }
      }
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are an expert MCAT tutor synthesizing research to deepen a student's understanding.
Given a flashcard topic and web research, create a comprehensive but digestible deep dive.

Structure your response as:
## Overview
Brief context of why this matters for the MCAT.

## Key Details
The important details from the research, explained clearly.

## Clinical/Real-World Connection
How this concept applies in practice (helps with MCAT passage-based questions).

## Related Concepts
Other MCAT topics this connects to.

## Practice Insight
A tricky MCAT-style question or insight based on this topic.

Use markdown formatting. Be thorough but concise.`,
      messages: [
        {
          role: "user",
          content: `Deep dive into this flashcard topic using the research provided:

Flashcard Question: ${card.front}
Flashcard Answer: ${card.back}
Category: ${card.category}

${webContent ? `Web Research:\n${webContent}` : "No web research available — use your knowledge."}`,
        },
      ],
    });

    const result = {
      content: message.content[0].text,
      sources,
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
