import { getStore } from "@netlify/blobs";
import { getDoc, setDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { deckId, deck, ownerId } = await req.json();
    if (!deckId || !deck) {
      return Response.json({ error: "deckId and deck required" }, { status: 400 });
    }

    // Determine the effective owner (for collaborator writes)
    let effectiveOwner = userId;
    if (ownerId && ownerId !== userId) {
      // Verify caller is a collaborator on the owner's deck
      const ownerDeck = await getDoc(`users/${ownerId}/decks/${deckId}`);
      if (!ownerDeck?.collaborators?.[userId]) {
        return Response.json({ error: "Not authorized to edit this deck" }, { status: 403 });
      }
      effectiveOwner = ownerId;
    }

    // Strip cards for Firestore metadata
    const { cards, ...metadata } = deck;
    const firestoreMeta = {
      ...metadata,
      cardCount: deck.cardCount || (cards ? cards.length : 0),
      updatedAt: new Date().toISOString(),
    };

    // Dual-write: metadata to Firestore, full deck (with cards) to Blob
    const store = getStore(`decks-${effectiveOwner}`);
    await Promise.all([
      setDoc(`users/${effectiveOwner}/decks/${deckId}`, firestoreMeta),
      store.setJSON(deckId, deck),
    ]);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Save deck error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
