import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id") || "default";

    const url = new URL(req.url);
    const deckId = url.searchParams.get("deckId");

    const store = getStore(`decks-${userId}`);

    // If deckId specified, load just that one deck with full cards
    if (deckId) {
      try {
        const deck = await store.get(deckId, { type: "json" });
        if (deck) {
          // If this is a reference deck, load cards from public store
          if (deck.isReference && deck.subscribedTo) {
            const publicStore = getStore("public-decks");
            try {
              const publicDeck = await publicStore.get(deck.subscribedTo, { type: "json" });
              if (publicDeck) {
                return Response.json({
                  deck: {
                    id: deckId,
                    ...deck,
                    cards: publicDeck.cards || [],
                    cardCount: publicDeck.cardCount || publicDeck.cards?.length || 0,
                  },
                });
              }
            } catch {}
            // Public deck was deleted — return empty
            return Response.json({
              deck: { id: deckId, ...deck, cards: [], cardCount: 0, _sourceDeleted: true },
            });
          }

          return Response.json({ deck: { id: deckId, ...deck } });
        }
      } catch {}
      return Response.json({ deck: null });
    }

    // Otherwise return all decks as summaries (no cards — too large)
    const { blobs } = await store.list();

    const decks = [];
    for (const blob of blobs) {
      try {
        const deck = await store.get(blob.key, { type: "json" });
        if (deck) {
          // Strip cards from the listing to keep response small
          const { cards, ...summary } = deck;
          decks.push({
            id: blob.key,
            ...summary,
            cardCount: deck.cardCount || (cards ? cards.length : 0),
          });
        }
      } catch {}
    }

    return Response.json({ decks });
  } catch (err) {
    console.error("Load decks error:", err);
    return Response.json({ decks: [] });
  }
}
