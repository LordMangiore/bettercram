export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to scrape URL");
    }

    const content =
      result.data?.markdown || result.markdown || "";
    const title =
      result.data?.metadata?.title || result.metadata?.title || "Study Document";

    return new Response(
      JSON.stringify({ content, title }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error scraping document:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to scrape document",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/scrape-doc",
};
