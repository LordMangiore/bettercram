// Extract Google Doc ID from various URL formats
function getGoogleDocId(url) {
  const patterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Extract Google Sheet ID
function getGoogleSheetId(url) {
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

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

    // Google Docs — use export API directly (fast, no Firecrawl needed)
    const docId = getGoogleDocId(url);
    if (docId) {
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const res = await fetch(exportUrl);
      if (res.ok) {
        const content = await res.text();
        if (content && content.length > 50) {
          return Response.json({ content, title: "Google Document", status: "done" });
        }
      }
      // If export fails, fall through to Firecrawl
      console.log("Google Doc export failed, falling back to Firecrawl");
    }

    // Google Sheets — use export API
    const sheetId = getGoogleSheetId(url);
    if (sheetId) {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const res = await fetch(exportUrl);
      if (res.ok) {
        const content = await res.text();
        if (content && content.length > 50) {
          return Response.json({ content, title: "Google Sheet", status: "done" });
        }
      }
      console.log("Google Sheet export failed, falling back to Firecrawl");
    }

    // Non-Google URLs — use Firecrawl
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
        waitFor: 3000,
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

