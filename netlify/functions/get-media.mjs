import { getStore } from "@netlify/blobs";

/**
 * Serve media files (images, audio) for flashcards.
 * Public endpoint — media is keyed by content hash so URLs aren't guessable.
 */
export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");

    if (!key || key.length > 64) {
      return new Response("Missing or invalid key", { status: 400 });
    }

    const store = getStore("card-media");
    const blob = await store.getWithMetadata(key, { type: "arrayBuffer" });

    if (!blob || !blob.data) {
      return new Response("Not found", { status: 404 });
    }

    const mimeType = blob.metadata?.mimeType || "application/octet-stream";

    return new Response(blob.data, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable", // cache forever (content-addressed)
      },
    });
  } catch (err) {
    console.error("Get media error:", err);
    return new Response("Error", { status: 500 });
  }
}
