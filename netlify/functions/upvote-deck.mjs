import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    const { publicDeckId } = await req.json();

    if (!publicDeckId) {
      return Response.json({ error: "publicDeckId required" }, { status: 400 });
    }

    const publicStore = getStore("public-decks");
    const deck = await publicStore.get(publicDeckId, { type: "json" });

    if (!deck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }

    // Track who has upvoted (one per user)
    if (!deck.upvotedBy) deck.upvotedBy = [];

    if (userId && deck.upvotedBy.includes(userId)) {
      // Already upvoted — toggle off (remove upvote)
      deck.upvotedBy = deck.upvotedBy.filter(id => id !== userId);
      deck.upvotes = deck.upvotedBy.length;
      await publicStore.setJSON(publicDeckId, deck);
      return Response.json({ success: true, upvotes: deck.upvotes, voted: false });
    }

    // Add upvote
    if (userId) deck.upvotedBy.push(userId);
    deck.upvotes = deck.upvotedBy.length;
    await publicStore.setJSON(publicDeckId, deck);

    return Response.json({ success: true, upvotes: deck.upvotes, voted: true });
  } catch (err) {
    console.error("Upvote error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
