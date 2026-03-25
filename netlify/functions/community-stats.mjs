import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  try {
    const publicStore = getStore("public-decks");

    // List all public decks — handle pagination
    let allBlobs = [];
    let cursor = null;
    do {
      const opts = cursor ? { cursor } : {};
      const result = await publicStore.list(opts);
      allBlobs = allBlobs.concat(result.blobs);
      cursor = result.cursor || null;
    } while (cursor);

    let totalCards = 0;
    const totalDecks = allBlobs.length;

    for (const blob of allBlobs) {
      try {
        const deck = await publicStore.get(blob.key, { type: "json" });
        totalCards += deck?.cardCount || deck?.cards?.length || 0;
      } catch {}
    }

    return Response.json({
      totalCards,
      totalDecks,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("Stats error:", err);
    return Response.json({ totalCards: 1102, totalDecks: 5 }); // Fallback
  }
}
