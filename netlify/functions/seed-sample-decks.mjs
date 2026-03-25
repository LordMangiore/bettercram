import { getStore } from "@netlify/blobs";
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
    const userId = req.headers.get("x-user-id") || "default";

    // Check for force flag in body
    let force = false;
    try {
      const body = await req.json();
      force = body?.force === true;
    } catch {}

    const store = getStore(`decks-${userId}`);

    // Only seed if user has no decks (unless forced)
    if (!force) {
      const { blobs } = await store.list();
      if (blobs.length > 0) {
        return Response.json({ seeded: false, message: "User already has decks", userId });
      }
    }

    // Seed onboarding deck into user's library
    for (const [id, deck] of Object.entries(USER_SEED_DECK)) {
      await store.setJSON(id, deck);
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
