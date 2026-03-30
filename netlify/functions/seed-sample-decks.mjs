import { getStore } from "@netlify/blobs";
import { setDoc, listDocs } from "./lib/firestore.mjs";
import onboardingCards from "./seed-data/onboarding-cards.json" with { type: "json" };

// Only the onboarding deck goes into every new user's library
const USER_SEED_DECK = {
  "deck-onboarding": {
    name: "Get to Know BetterCram",
    cards: onboardingCards,
    cardCount: onboardingCards.length,
    createdAt: new Date().toISOString(),
    description: "Learn how to use all 7 study modes, Nova voice tutor, community decks, and more!",
  },
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Check for force flag in body
    let force = false;
    try {
      const body = await req.json();
      force = body?.force === true;
    } catch {}

    // Only seed if user has no decks (unless forced)
    // Check Firestore first, fall back to Blob
    if (!force) {
      let hasDecks = false;

      try {
        const firestoreDecks = await listDocs(`users/${userId}/decks`);
        if (firestoreDecks.length > 0) hasDecks = true;
      } catch {}

      if (!hasDecks) {
        const store = getStore(`decks-${userId}`);
        const { blobs } = await store.list();
        if (blobs.length > 0) hasDecks = true;
      }

      if (hasDecks) {
        return Response.json({ seeded: false, message: "User already has decks", userId });
      }
    }

    // Seed onboarding deck into user's library
    const store = getStore(`decks-${userId}`);
    for (const [id, deck] of Object.entries(USER_SEED_DECK)) {
      // Strip cards for Firestore metadata
      const { cards, ...meta } = deck;

      // Dual-write: Firestore (metadata) + Blob (full deck with cards)
      await Promise.all([
        setDoc(`users/${userId}/decks/${id}`, {
          ...meta,
          cardCount: deck.cardCount,
        }),
        store.setJSON(id, deck),
      ]);
    }

    return Response.json({
      seeded: true,
      count: Object.keys(USER_SEED_DECK).length,
      totalCards: onboardingCards.length,
      userId,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
