import { getStore } from "@netlify/blobs";

/**
 * Upload media files (images, audio) for flashcards.
 * Stores in a global media blob store keyed by content hash.
 * Returns the URL to retrieve the media.
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

    if (!contentType.includes("multipart/form-data")) {
      return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const mediaKey = formData.get("key"); // content hash for dedup

    if (!file || typeof file === "string" || !mediaKey) {
      return Response.json({ error: "Missing file or key" }, { status: 400 });
    }

    // 10MB limit per file
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return Response.json({ error: "File too large (10MB max)" }, { status: 400 });
    }

    const store = getStore("card-media");

    // Check if already uploaded (dedup by content hash)
    try {
      const existing = await store.get(mediaKey);
      if (existing) {
        return Response.json({
          url: `/.netlify/functions/get-media?key=${mediaKey}`,
          key: mediaKey,
          cached: true,
        });
      }
    } catch {}

    // Validate MIME type — only allow images and audio
    const mimeType = file.type || "application/octet-stream";
    const ALLOWED_TYPES = new Set([
      "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml",
      "audio/mpeg", "audio/ogg", "audio/wav", "audio/mp4", "audio/m4a",
      "application/octet-stream", // fallback for unknown types from Anki
    ]);
    if (!ALLOWED_TYPES.has(mimeType)) {
      return Response.json({ error: "Unsupported file type: " + mimeType }, { status: 400 });
    }
    await store.set(mediaKey, new Uint8Array(buffer), {
      metadata: { mimeType, originalName: file.name || "media", userId },
    });

    return Response.json({
      url: `/.netlify/functions/get-media?key=${mediaKey}`,
      key: mediaKey,
      cached: false,
    });
  } catch (err) {
    console.error("Upload media error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
