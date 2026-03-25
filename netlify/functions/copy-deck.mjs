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

    const { publicDeckId, action } = await req.json();
    // action: "subscribe" (default) or "clone"

    if (!publicDeckId) {
      return Response.json({ error: "publicDeckId required" }, { status: 400 });
    }

    // Load the public deck
    const publicStore = getStore("public-decks");
    const publicDeck = await publicStore.get(publicDeckId, { type: "json" });

    if (!publicDeck) {
      return Response.json({ error: "Public deck not found" }, { status: 404 });
    }

    const userStore = getStore(`decks-${userId}`);

    if (action === "clone") {
      // Full copy — user owns it, can edit, disconnected from original
      const newDeckId = "deck-clone-" + Date.now();
      const clonedDeck = {
        name: publicDeck.name + " (My Copy)",
        description: publicDeck.description || "",
        cards: publicDeck.cards || [],
        cardCount: publicDeck.cardCount || publicDeck.cards?.length || 0,
        progress: {},
        createdAt: new Date().toISOString(),
        clonedFrom: publicDeckId,
        isClone: true,
      };

      await userStore.setJSON(newDeckId, clonedDeck);

      return Response.json({
        success: true,
        deckId: newDeckId,
        name: clonedDeck.name,
        cardCount: clonedDeck.cardCount,
        type: "clone",
      });
    }

    // Default: Subscribe — save a reference, cards load from public store
    // Check for existing subscription to this public deck
    const { blobs } = await userStore.list();
    for (const blob of blobs) {
      try {
        const existing = await userStore.get(blob.key, { type: "json" });
        if (existing?.subscribedTo === publicDeckId) {
          return Response.json({
            success: true,
            deckId: blob.key,
            name: existing.name,
            cardCount: existing.cardCount,
            type: "subscribe",
            alreadySubscribed: true,
          });
        }
      } catch {}
    }

    const newDeckId = "deck-ref-" + Date.now();
    const refDeck = {
      name: publicDeck.name,
      description: publicDeck.description || "",
      cardCount: publicDeck.cardCount || publicDeck.cards?.length || 0,
      progress: {},
      createdAt: new Date().toISOString(),
      subscribedTo: publicDeckId,
      isReference: true,
      author: publicDeck.author,
    };

    await userStore.setJSON(newDeckId, refDeck);

    // Increment subscriber count on public deck
    publicDeck.copies = (publicDeck.copies || 0) + 1;
    await publicStore.setJSON(publicDeckId, publicDeck);

    return Response.json({
      success: true,
      deckId: newDeckId,
      name: refDeck.name,
      cardCount: refDeck.cardCount,
      type: "subscribe",
    });
  } catch (err) {
    console.error("Copy/subscribe deck error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
