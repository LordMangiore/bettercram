import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return Response.json({ error: "Auth required" }, { status: 401 });
    }

    const { deckId, action, userInfo } = await req.json(); // action: "publish" or "unpublish"

    const userName = userInfo?.name || userInfo?.email?.split("@")[0] || "Anonymous";

    if (!deckId) {
      return Response.json({ error: "deckId required" }, { status: 400 });
    }

    // Load the user's deck
    const userStore = getStore(`decks-${userId}`);
    const deck = await userStore.get(deckId, { type: "json" });

    if (!deck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }

    const publicStore = getStore("public-decks");

    if (action === "unpublish") {
      // Remove from public store
      await publicStore.delete(`${userId}-${deckId}`);
      // Update user's deck to mark as not public
      deck.isPublic = false;
      await userStore.setJSON(deckId, deck);
      return Response.json({ success: true, action: "unpublished" });
    }

    // Publish — save a copy to public store
    const publicDeck = {
      name: deck.name,
      description: deck.description || "",
      cardCount: deck.cardCount || deck.cards?.length || 0,
      categories: [...new Set((deck.cards || []).map(c => c.category).filter(Boolean))],
      createdAt: deck.createdAt || new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      author: {
        name: userName,
        id: userId,
      },
      cards: deck.cards || [],
      copies: 0,
      upvotes: 0,
    };

    await publicStore.setJSON(`${userId}-${deckId}`, publicDeck);

    // Mark user's deck as public
    deck.isPublic = true;
    deck.publicId = `${userId}-${deckId}`;
    await userStore.setJSON(deckId, deck);

    return Response.json({ success: true, action: "published", publicId: `${userId}-${deckId}` });
  } catch (err) {
    console.error("Publish error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
