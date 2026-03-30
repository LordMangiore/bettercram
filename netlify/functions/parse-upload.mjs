import pdf from "pdf-parse/lib/pdf-parse.js";

/**
 * Parse uploaded files (PDF or Anki .apkg) and return content.
 *
 * PDF: extracts text, returns { type: "text", content, title }
 * Anki: extracts cards from SQLite DB inside zip, returns { type: "cards", cards }
 */
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart form data
    if (!contentType.includes("multipart/form-data")) {
      return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name || "upload";
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Enforce size limit (20MB)
    if (fileBuffer.length > 20 * 1024 * 1024) {
      return Response.json({ error: "File too large. Maximum 20MB." }, { status: 400 });
    }

    const ext = fileName.toLowerCase().split(".").pop();

    // ── PDF ──
    if (ext === "pdf") {
      try {
        const data = await pdf(fileBuffer);
        const text = data.text?.trim();

        if (!text || text.length < 50) {
          return Response.json({ error: "Could not extract text from this PDF. It may be image-based or scanned." }, { status: 400 });
        }

        return Response.json({
          type: "text",
          content: text.slice(0, 500_000), // cap at 500K chars
          title: fileName.replace(/\.pdf$/i, ""),
          pages: data.numpages,
          chars: text.length,
        });
      } catch (err) {
        console.error("PDF parse error:", err);
        return Response.json({ error: "Failed to parse PDF: " + err.message }, { status: 400 });
      }
    }

    // ── Anki .apkg ──
    if (ext === "apkg") {
      try {
        // .apkg is a zip file containing a SQLite database
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(fileBuffer);

        // Find the SQLite database (collection.anki2 or collection.anki21)
        let dbFile = zip.file("collection.anki2") || zip.file("collection.anki21");
        if (!dbFile) {
          // Try any .anki2 file
          const files = Object.keys(zip.files);
          const anki2File = files.find(f => f.endsWith(".anki2") || f.endsWith(".anki21"));
          if (anki2File) dbFile = zip.file(anki2File);
        }

        if (!dbFile) {
          return Response.json({ error: "Could not find Anki database in .apkg file" }, { status: 400 });
        }

        const dbBuffer = await dbFile.async("uint8array");

        // Use sql.js to parse SQLite
        const initSqlJs = (await import("sql.js")).default;
        const SQL = await initSqlJs();
        const db = new SQL.Database(dbBuffer);

        // Extract notes (cards)
        const notes = db.exec("SELECT flds, tags FROM notes LIMIT 10000");
        const cards = [];

        if (notes.length > 0 && notes[0].values) {
          for (const row of notes[0].values) {
            const fields = String(row[0]).split("\x1f"); // Anki uses unit separator
            const tags = String(row[1] || "").trim();

            if (fields.length >= 2) {
              // Strip HTML tags from Anki fields
              const stripHtml = (html) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

              const front = stripHtml(fields[0]);
              const back = stripHtml(fields[1]);

              if (front && back && front.length > 1 && back.length > 1) {
                cards.push({
                  front,
                  back,
                  category: tags.split(" ").filter(t => t && !t.startsWith("leech")).join(", ") || "Imported",
                  difficulty: "medium",
                });
              }
            }
          }
        }

        db.close();

        if (cards.length === 0) {
          return Response.json({ error: "No cards found in Anki file" }, { status: 400 });
        }

        // Try to get deck name
        let deckName = fileName.replace(/\.apkg$/i, "");
        try {
          const decks = db.exec("SELECT decks FROM col LIMIT 1");
          if (decks.length > 0) {
            const deckJson = JSON.parse(decks[0].values[0][0]);
            const deckIds = Object.keys(deckJson).filter(k => k !== "1");
            if (deckIds.length > 0) deckName = deckJson[deckIds[0]].name || deckName;
          }
        } catch {}

        return Response.json({
          type: "cards",
          cards,
          title: deckName,
          count: cards.length,
        });
      } catch (err) {
        console.error("Anki parse error:", err);
        return Response.json({ error: "Failed to parse Anki file: " + err.message }, { status: 400 });
      }
    }

    return Response.json({ error: `Unsupported file type: .${ext}. Upload a PDF or Anki .apkg file.` }, { status: 400 });
  } catch (err) {
    console.error("Upload parse error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
