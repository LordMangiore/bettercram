import { getStore } from "@netlify/blobs";

const PAGE_SIZE = 500;

export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const deckId = url.searchParams.get("deckId");
    const page = parseInt(url.searchParams.get("page") || "0", 10);

    if (!deckId) {
      return Response.json({ error: "deckId is required" }, { status: 400 });
    }

    // Try v2 paginated store first
    const cardStore = getStore("deck-cards");
    const pageData = await cardStore.get(`${userId}-${deckId}-page-${page}`, { type: "json" });

    if (pageData) {
      return Response.json({
        cards: pageData.cards,
        page: pageData.page,
        totalPages: pageData.totalPages,
      });
    }

    // V1 fallback: load full deck and slice
    const deckStore = getStore(`decks-${userId}`);
    const deck = await deckStore.get(deckId, { type: "json" });

    if (!deck || !deck.cards) {
      return Response.json({ cards: [], page: 0, totalPages: 0 });
    }

    const allCards = deck.cards;
    const totalPages = Math.ceil(allCards.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const cards = allCards.slice(start, start + PAGE_SIZE);

    return Response.json({ cards, page, totalPages });
  } catch (err) {
    console.error("Load deck cards error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/load-deck-cards",
};
