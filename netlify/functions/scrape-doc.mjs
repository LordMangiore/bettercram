export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { url, attempt } = await req.json();
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!url) {
      return Response.json({ error: "No URL provided" }, { status: 400 });
    }

    // Use a longer Firecrawl timeout for large docs
    // The Netlify function has a 26s limit, so we set Firecrawl to 25s
    // If Firecrawl needs more time, it'll return a SCRAPE_TIMEOUT error
    // and the frontend will retry (Firecrawl caches partial work so retries are faster)
    const firecrawlTimeout = (attempt || 1) >= 2 ? 120000 : 25000;

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        timeout: firecrawlTimeout,
      }),
    });

    const result = await response.json();

    if (result.success) {
      const content = result.data?.markdown || result.markdown || "";
      const title = result.data?.metadata?.title || result.metadata?.title || "Study Document";
      return Response.json({ content, title, status: "done" });
    }

    // Firecrawl timeout — tell frontend to retry
    if (result.code === "SCRAPE_TIMEOUT") {
      return Response.json({
        status: "retry",
        message: "Large document — retrying with extended timeout...",
        url,
      });
    }

    // Other Firecrawl error
    return Response.json({
      error: result.error || "Failed to scrape document",
      status: "error",
    }, { status: 422 });

  } catch (error) {
    console.error("Error scraping document:", error);
    return Response.json(
      { error: error.message || "Failed to scrape document" },
      { status: 500 }
    );
  }
};

