import { getStore } from "@netlify/blobs";

/**
 * Nova card search tool — ElevenLabs calls this mid-conversation
 * to find relevant cards from a user's deck.
 *
 * Query params:
 *   userId  — the deck owner's ID
 *   deckId  — which deck to search
 *   query   — search term (matched against front, back, category)
 *   limit   — max results (default 15)
 */
export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const deckId = url.searchParams.get("deckId");
    const query = (url.searchParams.get("query") || "").toLowerCase().trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "15"), 30);

    if (!userId || !deckId) {
      return Response.json({ error: "userId and deckId required" }, { status: 400 });
    }

    if (!query) {
      return Response.json({ error: "query is required" }, { status: 400 });
    }

    // Load all pages of the deck
    const cardStore = getStore("deck-cards");
    const allCards = [];
    let page = 0;

    while (true) {
      const pageData = await cardStore.get(`${userId}-${deckId}-page-${page}`, { type: "json" });
      if (!pageData || !pageData.cards || pageData.cards.length === 0) break;
      allCards.push(...pageData.cards);
      page++;
      if (page > 100) break; // safety cap
    }

    // Fallback: try v1 storage
    if (allCards.length === 0) {
      const deckStore = getStore(`decks-${userId}`);
      const deck = await deckStore.get(deckId, { type: "json" });
      if (deck?.cards) allCards.push(...deck.cards);
    }

    if (allCards.length === 0) {
      return Response.json({ cards: [], total: 0, message: "No cards found in deck" });
    }

    // Split query into keywords for flexible matching
    const keywords = query.split(/\s+/).filter(k => k.length > 1);

    // Score each card by relevance
    const scored = allCards.map(card => {
      const front = (card.front || "").toLowerCase();
      const back = (card.back || "").toLowerCase();
      const category = (card.category || "").toLowerCase();
      const combined = `${front} ${back} ${category}`;

      let score = 0;

      // Exact phrase match (highest weight)
      if (front.includes(query)) score += 10;
      if (back.includes(query)) score += 8;
      if (category.includes(query)) score += 6;

      // Individual keyword matches
      for (const kw of keywords) {
        if (front.includes(kw)) score += 3;
        if (back.includes(kw)) score += 2;
        if (category.includes(kw)) score += 2;
      }

      // Category exact match bonus
      if (category === query) score += 5;

      return { card, score };
    });

    // Filter to matches and sort by relevance
    const results = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        front: s.card.front,
        back: s.card.back,
        category: s.card.category,
      }));

    return Response.json({
      cards: results,
      total: results.length,
      deckTotal: allCards.length,
    });
  } catch (err) {
    console.error("Nova search cards error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/nova-search-cards",
};
