/**
 * Client-side Anki .apkg parser.
 *
 * Parses the zip file in the browser — handles files of any size (including 2.7GB AnKing).
 * Extracts cards, images, and audio from the SQLite database and media files.
 *
 * Returns { cards, media } where:
 * - cards: Array of { front, back, category, difficulty, images, audio }
 * - media: Map of filename → { blob, type }
 */

import JSZip from "jszip";
import initSqlJs from "sql.js";

// sql.js needs its WASM file — load from CDN
const SQL_WASM_URL = "https://sql.js.org/dist/sql-wasm.wasm";

// ─── Exported text processing helpers (testable without JSZip/sql.js) ───

/** Strip HTML tags, decode entities, preserve newlines. */
export function stripHtml(html) {
  return html
    .replace(/\[sound:[^\]]+\]/g, "") // remove sound tags
    .replace(/<img[^>]*>/g, "") // remove img tags (we handle them separately)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Parse cloze deletions. Returns { front, back } with blanks/answers. */
export function parseCloze(front, back) {
  const clozeFront = front.replace(/\{\{c\d+::([\s\S]*?)(?:::[^}]*)?\s*\}\}/g, "_____");
  const clozeBack = front.replace(/\{\{c\d+::([\s\S]*?)(?:::[^}]*)?\s*\}\}/g, (_, answer) => answer.trim());
  if (back && back !== front) {
    return { front: clozeFront, back: clozeBack + "\n\n" + back };
  }
  return { front: clozeFront, back: clozeBack };
}

/** Extract primary category from Anki tags string. */
export function extractCategory(tags) {
  const rawTags = tags.split(" ").filter(t => t && !t.startsWith("leech") && !t.startsWith("marked") && t !== "S");

  let primaryCategory = "Imported";
  for (const t of rawTags) {
    const clean = t.replace(/^#/, "");
    const parts = clean.split("::");

    const subjectIdx = parts.findIndex(p => p.toLowerCase() === "subject");
    if (subjectIdx >= 0 && parts[subjectIdx + 1]) {
      primaryCategory = parts[subjectIdx + 1].replace(/_/g, " ");
      return primaryCategory;
    }

    const systemIdx = parts.findIndex(p => p.toLowerCase() === "system");
    if (systemIdx >= 0 && parts[systemIdx + 1]) {
      primaryCategory = parts[systemIdx + 1].replace(/_/g, " ").replace(/\//g, " / ");
      return primaryCategory;
    }
  }

  if (primaryCategory === "Imported" && rawTags.length > 0) {
    const fallback = rawTags[0].replace(/^#/, "").split("::").pop();
    if (fallback && fallback.length > 1 && fallback.length < 40) {
      primaryCategory = fallback.replace(/_/g, " ");
    }
  }

  return primaryCategory;
}

/** Extract image and audio filenames from HTML content. */
export function extractMediaRefs(html) {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const soundRegex = /\[sound:([^\]]+)\]/gi;
  const images = [];
  const audio = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) images.push(match[1]);
  while ((match = soundRegex.exec(html)) !== null) audio.push(match[1]);
  return { images, audio };
}

/**
 * Parse an Anki .apkg File object.
 * @param {File} file - The .apkg file
 * @param {function} onProgress - Progress callback: (stage, detail)
 * @returns {{ cards, media, deckName }}
 */
export async function parseAnkiFile(file, onProgress = () => {}) {
  onProgress("reading", "Reading file...");

  const arrayBuffer = await file.arrayBuffer();

  onProgress("unzipping", "Extracting archive...");
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find the SQLite database — prefer anki21 (newer format, has full data)
  let dbFile = zip.file("collection.anki21") || zip.file("collection.anki2");
  if (!dbFile) {
    const files = Object.keys(zip.files);
    const ankiFile = files.find(f => f.endsWith(".anki2") || f.endsWith(".anki21"));
    if (ankiFile) dbFile = zip.file(ankiFile);
  }

  if (!dbFile) {
    throw new Error("Could not find Anki database in .apkg file");
  }

  onProgress("parsing", "Parsing database...");
  const dbBuffer = await dbFile.async("uint8array");

  const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
  const db = new SQL.Database(dbBuffer);

  let notes, deckName;
  try {
    // Build media filename map (Anki stores media as numbered files: 0, 1, 2...)
    let mediaMap = {}; // numeric index → original filename
    try {
      const mediaFile = zip.file("media");
      if (mediaFile) {
        const mediaJson = await mediaFile.async("text");
        mediaMap = JSON.parse(mediaJson);
      }
    } catch (e) {
      console.warn("Could not parse media map:", e);
    }
    // Attach to outer scope for media extraction later
    zip._mediaMap = mediaMap;

    onProgress("extracting", `Found ${Object.keys(mediaMap).length} media files. Extracting cards...`);

    // Extract notes
    notes = db.exec("SELECT flds, tags FROM notes LIMIT 50000");

    // Try to get deck name — use the top-level parent, not a sub-deck
    deckName = file.name.replace(/\.apkg$/i, "");
    try {
      const colResult = db.exec("SELECT decks FROM col LIMIT 1");
      if (colResult.length > 0) {
        const deckJson = JSON.parse(colResult[0].values[0][0]);
        const deckIds = Object.keys(deckJson).filter(k => k !== "1");
        if (deckIds.length > 0) {
          let name = deckJson[deckIds[0]].name || deckName;
          if (name.includes("::")) name = name.split("::")[0];
          deckName = name;
        }
      }
    } catch {}
  } finally {
    db.close();
  }

  const mediaMap = zip._mediaMap || {};
  const cards = [];

  if (!notes.length || !notes[0].values) {
    throw new Error("No cards found in Anki file");
  }

  // Collect all referenced media filenames
  const referencedMedia = new Set();

  for (const row of notes[0].values) {
    const fields = String(row[0]).split("\x1f");
    const tags = String(row[1] || "").trim();

    if (fields.length < 2) continue;

    let front = fields[0];
    let back = fields[1];

    // Extract media references from raw HTML
    const frontMedia = extractMediaRefs(front);
    const backMedia = extractMediaRefs(back);
    const frontImages = frontMedia.images;
    const backImages = backMedia.images;
    const frontAudio = frontMedia.audio;
    const backAudio = backMedia.audio;
    [...frontImages, ...backImages, ...frontAudio, ...backAudio].forEach(f => referencedMedia.add(f));

    let cleanFront = stripHtml(front);
    let cleanBack = stripHtml(back);

    // Handle Anki cloze deletions
    const isCloze = /\{\{c\d+::/.test(cleanFront) || /\{\{c\d+::/.test(cleanBack);
    if (isCloze) {
      const cloze = parseCloze(cleanFront, cleanBack);
      cleanFront = cloze.front;
      cleanBack = cloze.back;
    }

    if (!cleanFront && frontImages.length === 0 && frontAudio.length === 0) continue;

    const primaryCategory = extractCategory(tags);

    cards.push({
      front: cleanFront || (frontAudio.length > 0 ? "Listen and identify" : "(image card)"),
      back: cleanBack || (backAudio.length > 0 ? "Listen to answer" : backImages.length > 0 ? "(see image)" : ""),
      category: primaryCategory,
      difficulty: "medium",
      // Media references (filenames, not yet URLs)
      frontImages,
      backImages,
      frontAudio,
      backAudio,
    });
  }

  onProgress("media", `Extracting ${referencedMedia.size} media files...`);

  // Build reverse media map (original filename → zip index)
  const reverseMediaMap = {};
  for (const [index, filename] of Object.entries(mediaMap)) {
    reverseMediaMap[filename] = index;
  }

  // Extract referenced media files from the zip
  const media = new Map();
  let mediaCount = 0;

  for (const filename of referencedMedia) {
    const zipIndex = reverseMediaMap[filename];
    if (zipIndex === undefined) continue;

    const mediaFile = zip.file(zipIndex);
    if (!mediaFile) continue;

    try {
      const blob = await mediaFile.async("blob");
      const ext = filename.split(".").pop().toLowerCase();
      const mimeTypes = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
        svg: "image/svg+xml", webp: "image/webp",
        mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", m4a: "audio/mp4",
      };
      media.set(filename, {
        blob,
        type: mimeTypes[ext] || "application/octet-stream",
        isImage: ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext),
        isAudio: ["mp3", "ogg", "wav", "m4a"].includes(ext),
      });
      mediaCount++;

      if (mediaCount % 50 === 0) {
        onProgress("media", `Extracted ${mediaCount}/${referencedMedia.size} media files...`);
      }
    } catch (e) {
      console.warn(`Failed to extract media: ${filename}`, e);
    }
  }

  onProgress("done", `${cards.length} cards, ${media.size} media files`);

  return { cards, media, deckName };
}

/**
 * Upload extracted media files to the server.
 * Returns a map of original filename → server URL.
 *
 * @param {Map} media - From parseAnkiFile
 * @param {function} onProgress - Progress callback
 * @returns {Map<string, string>} filename → URL
 */
export async function uploadAnkiMedia(media, onProgress = () => {}) {
  const headers = {};
  try {
    const user = JSON.parse(localStorage.getItem("mcat-user"));
    if (user?.id) headers["X-User-Id"] = user.id;
  } catch {}
  const token = localStorage.getItem("mcat-access-token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const urlMap = new Map();
  let uploaded = 0;
  const total = media.size;

  // Upload in batches of 5
  const entries = Array.from(media.entries());
  const BATCH = 5;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);

    await Promise.all(batch.map(async ([filename, { blob, type }]) => {
      try {
        // Generate content hash for dedup
        const arrayBuf = await blob.arrayBuffer();
        const hashBuf = await crypto.subtle.digest("SHA-256", arrayBuf);
        const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

        const formData = new FormData();
        formData.append("file", new Blob([arrayBuf], { type }), filename);
        formData.append("key", hash);

        const res = await fetch("/.netlify/functions/upload-media", {
          method: "POST",
          headers, // no Content-Type — FormData sets it
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          urlMap.set(filename, data.url);
        }
      } catch (e) {
        console.warn(`Failed to upload media: ${filename}`, e);
      }

      uploaded++;
      onProgress("uploading", `Uploading media ${uploaded}/${total}...`);
    }));
  }

  return urlMap;
}

/**
 * Replace media references in cards with server URLs.
 */
export function resolveCardMedia(cards, urlMap) {
  return cards.map(card => ({
    ...card,
    frontImages: card.frontImages?.map(f => urlMap.get(f)).filter(Boolean) || [],
    backImages: card.backImages?.map(f => urlMap.get(f)).filter(Boolean) || [],
    frontAudio: card.frontAudio?.map(f => urlMap.get(f)).filter(Boolean) || [],
    backAudio: card.backAudio?.map(f => urlMap.get(f)).filter(Boolean) || [],
  }));
}
