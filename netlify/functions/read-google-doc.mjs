export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { docId, accessToken } = await req.json();

    if (!docId || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing docId or accessToken" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch doc content via Google Docs API
    const res = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Docs API error: ${res.status} - ${err}`);
    }

    const doc = await res.json();

    // Extract text from the document structure
    let text = "";
    if (doc.body?.content) {
      for (const element of doc.body.content) {
        if (element.paragraph?.elements) {
          for (const e of element.paragraph.elements) {
            if (e.textRun?.content) {
              text += e.textRun.content;
            }
          }
        }
        if (element.table) {
          for (const row of element.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              for (const cellContent of cell.content || []) {
                if (cellContent.paragraph?.elements) {
                  for (const e of cellContent.paragraph.elements) {
                    if (e.textRun?.content) {
                      text += e.textRun.content;
                    }
                  }
                }
              }
              text += "\t";
            }
            text += "\n";
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        content: text,
        title: doc.title || "Study Document",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error reading Google Doc:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to read document" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/read-google-doc",
};
