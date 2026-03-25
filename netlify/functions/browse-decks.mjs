import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const publicStore = getStore("public-decks");
    const { blobs } = await publicStore.list();

    const decks = [];
    for (const blob of blobs) {
      try {
        const deck = await publicStore.get(blob.key, { type: "json" });
        if (deck) {
          decks.push({
            id: blob.key,
            name: deck.name,
            description: deck.description,
            cardCount: deck.cardCount,
            categories: deck.categories || [],
            author: deck.author,
            publishedAt: deck.publishedAt,
            copies: deck.copies || 0,
            upvotes: deck.upvotes || 0,
          });
        }
      } catch {}
    }

    // Sort by copies + upvotes (most popular first)
    decks.sort((a, b) => (b.copies + b.upvotes) - (a.copies + a.upvotes));

    return Response.json({ decks });
  } catch (err) {
    console.error("Browse error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
