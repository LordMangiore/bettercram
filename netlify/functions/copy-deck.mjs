import { getStore } from "@netlify/blobs";
import { setDoc, listDocs } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    console.log("copy-deck: userId =", userId);

    if (!userId) {
      return Response.json({ error: "Auth required" }, { status: 401 });
    }

    const { publicDeckId, action } = await req.json();
    console.log("copy-deck: publicDeckId =", publicDeckId, "action =", action);
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

      // Metadata for Firestore (no cards)
      const { cards, ...cloneMeta } = clonedDeck;

      // Dual-write: Firestore (metadata) + Blob (full deck with cards)
      await Promise.all([
        setDoc(`users/${userId}/decks/${newDeckId}`, cloneMeta),
        userStore.setJSON(newDeckId, clonedDeck),
      ]);

      return Response.json({
        success: true,
        deckId: newDeckId,
        name: clonedDeck.name,
        cardCount: clonedDeck.cardCount,
        type: "clone",
      });
    }

    // Default: Subscribe — save a reference, cards load from public store
    // Dedup check: use Firestore listDocs first, fall back to Blob
    let existingSubscription = null;
    try {
      const firestoreDecks = await listDocs(`users/${userId}/decks`);
      for (const { id, data } of firestoreDecks) {
        if (data?.subscribedTo === publicDeckId) {
          existingSubscription = { key: id, data };
          break;
        }
      }
    } catch {}

    if (!existingSubscription) {
      // Fall back to Blob scan
      const { blobs } = await userStore.list();
      for (const blob of blobs) {
        try {
          const existing = await userStore.get(blob.key, { type: "json" });
          if (existing?.subscribedTo === publicDeckId) {
            existingSubscription = { key: blob.key, data: existing };
            break;
          }
        } catch {}
      }
    }

    if (existingSubscription) {
      return Response.json({
        success: true,
        deckId: existingSubscription.key,
        name: existingSubscription.data.name,
        cardCount: existingSubscription.data.cardCount,
        type: "subscribe",
        alreadySubscribed: true,
      });
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

    // Dual-write: Firestore (INSTANT) + Blob backup
    await Promise.all([
      setDoc(`users/${userId}/decks/${newDeckId}`, refDeck),
      userStore.setJSON(newDeckId, refDeck),
    ]);
    console.log("copy-deck: saved subscription", newDeckId, "to Firestore + Blob");

    // Increment subscriber count on public deck (stays in Blob)
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
