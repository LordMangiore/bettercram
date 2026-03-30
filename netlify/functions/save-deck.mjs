import { getStore } from "@netlify/blobs";
import { setDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { deckId, deck } = await req.json();
    if (!deckId || !deck) {
      return Response.json({ error: "deckId and deck required" }, { status: 400 });
    }

    // Strip cards for Firestore metadata
    const { cards, ...metadata } = deck;
    const firestoreMeta = {
      ...metadata,
      cardCount: deck.cardCount || (cards ? cards.length : 0),
      updatedAt: new Date().toISOString(),
    };

    // Dual-write: metadata to Firestore, full deck (with cards) to Blob
    const store = getStore(`decks-${userId}`);
    await Promise.all([
      setDoc(`users/${userId}/decks/${deckId}`, firestoreMeta),
      store.setJSON(deckId, deck),
    ]);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Save deck error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
