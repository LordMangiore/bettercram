export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { url, limit = 25 } = await req.json();
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!url) {
      return Response.json({ error: "No URL provided" }, { status: 400 });
    }

    // Step 1: Map the site to discover URLs
    let mappedUrls = 0;
    try {
      const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(15000),
      });
      const mapData = await mapRes.json();
      if (mapData.success && mapData.links) {
        mappedUrls = mapData.links.length;
      }
    } catch (e) {
      console.log("Map failed (non-critical):", e.message);
    }

    // Step 2: Start async crawl
    const crawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        limit: Math.min(limit, 50),
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    const crawlData = await crawlRes.json();

    if (!crawlData.success || !crawlData.id) {
      return Response.json({
        error: crawlData.error || "Failed to start crawl",
        status: "error",
      }, { status: 422 });
    }

    return Response.json({
      jobId: crawlData.id,
      mappedUrls: mappedUrls || null,
      status: "crawling",
    });

  } catch (error) {
    console.error("Crawl start error:", error);
    return Response.json(
      { error: error.message || "Failed to start crawl" },
      { status: 500 }
    );
  }
};
