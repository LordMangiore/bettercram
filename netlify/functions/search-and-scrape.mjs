export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { topic, limit = 5 } = await req.json();
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!topic || topic.trim().length < 2) {
      return Response.json({ error: "Please enter a topic to search" }, { status: 400 });
    }

    // Step 1: Firecrawl Search — find the best educational sources
    const searchQuery = `${topic} study guide explanation educational`;
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        limit,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchRes.json();
    if (!searchData.success || !searchData.data?.length) {
      return Response.json({
        error: "No sources found for this topic. Try a more specific query.",
        status: "error",
      }, { status: 422 });
    }

    // Step 2: Collect content from search results
    // Firecrawl Search with scrapeOptions already returns markdown content
    const sources = [];
    let aggregatedContent = "";

    for (const result of searchData.data.slice(0, limit)) {
      const markdown = result.markdown || result.content || "";
      if (markdown.length > 50) {
        const truncated = markdown.slice(0, 4000);
        sources.push({
          title: result.metadata?.title || result.title || result.url,
          url: result.url,
        });
        aggregatedContent += `\n\n--- Source: ${result.metadata?.title || result.url} ---\n\n${truncated}`;
      }
    }

    // If search didn't return inline content, scrape top results
    if (aggregatedContent.length < 200 && searchData.data.length > 0) {
      const urlsToScrape = searchData.data.slice(0, 3).map(r => r.url).filter(Boolean);

      const scrapeResults = await Promise.allSettled(
        urlsToScrape.map(url =>
          fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              url,
              formats: ["markdown"],
              timeout: 15000,
            }),
            signal: AbortSignal.timeout(20000),
          }).then(r => r.json())
        )
      );

      for (let i = 0; i < scrapeResults.length; i++) {
        const r = scrapeResults[i];
        if (r.status === "fulfilled" && r.value.success) {
          const md = r.value.data?.markdown || "";
          if (md.length > 50) {
            const title = r.value.data?.metadata?.title || urlsToScrape[i];
            if (!sources.find(s => s.url === urlsToScrape[i])) {
              sources.push({ title, url: urlsToScrape[i] });
            }
            aggregatedContent += `\n\n--- Source: ${title} ---\n\n${md.slice(0, 4000)}`;
          }
        }
      }
    }

    if (aggregatedContent.length < 100) {
      return Response.json({
        error: "Found sources but could not extract enough content. Try a different topic.",
        status: "error",
      }, { status: 422 });
    }

    return Response.json({
      content: aggregatedContent,
      sources,
      status: "done",
    });

  } catch (error) {
    console.error("Search-and-scrape error:", error);
    return Response.json(
      { error: error.message || "Failed to search and scrape" },
      { status: 500 }
    );
  }
};
