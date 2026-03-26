export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { jobId } = await req.json();
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!jobId) {
      return Response.json({ error: "No job ID provided" }, { status: 400 });
    }

    const res = await fetch(`https://api.firecrawl.dev/v1/crawl/${jobId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await res.json();

    if (data.status === "completed") {
      // Aggregate all page content
      const pages = data.data || [];
      let content = "";
      const sources = [];

      for (const page of pages) {
        const md = page.markdown || "";
        if (md.length > 50) {
          const title = page.metadata?.title || page.metadata?.url || "Page";
          const url = page.metadata?.sourceURL || page.metadata?.url || "";
          sources.push({ title, url });
          // Truncate each page to keep total manageable
          content += `\n\n--- ${title} ---\n\n${md.slice(0, 4000)}`;
        }
      }

      return Response.json({
        status: "completed",
        content,
        pageCount: sources.length,
        sources,
        total: data.total || pages.length,
      });
    }

    // Still crawling
    const completed = data.completed || 0;
    const total = data.total || "?";
    return Response.json({
      status: "crawling",
      progress: `Crawling... ${completed}/${total} pages`,
      completed,
      total,
    });

  } catch (error) {
    console.error("Crawl poll error:", error);
    return Response.json(
      { error: error.message || "Failed to check crawl status" },
      { status: 500 }
    );
  }
};
