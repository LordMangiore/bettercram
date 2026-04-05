import { getStore } from "@netlify/blobs";
import { deleteDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { deckId } = await req.json();
    if (!deckId) {
      return Response.json({ error: "deckId required" }, { status: 400 });
    }

    // Delete from Firestore: deck metadata, progress, review logs
    await Promise.all([
      deleteDoc(`users/${userId}/decks/${deckId}`),
      deleteDoc(`users/${userId}/progress/${deckId}`),
      deleteDoc(`users/${userId}/reviewLogs/${deckId}`),
    ]);

    // Delete from Blob (backup cleanup)
    const store = getStore(`decks-${userId}`);
    // Load deck first to check if it was published
    let deckData = null;
    try {
      deckData = await store.get(deckId, { type: "json" });
    } catch {}

    // Clean up public-decks if this deck was shared to community
    if (deckData?.isPublic) {
      try {
        const publicStore = getStore("public-decks");
        const publicKey = deckData.publicId || `${userId}-${deckId}`;
        await publicStore.delete(publicKey);
      } catch {}
    }

    await store.delete(deckId);

    // Also clean up v2 paginated cards (stays in Blob)
    try {
      const cardStore = getStore("deck-cards");
      // Delete up to 50 pages (covers decks up to 25,000 cards)
      const deletePromises = [];
      for (let i = 0; i < 50; i++) {
        deletePromises.push(cardStore.delete(`${userId}-${deckId}-page-${i}`));
      }
      await Promise.allSettled(deletePromises);
    } catch {}

    // Clean up v2 progress from Blob
    try {
      const progressStore = getStore("deck-progress");
      await progressStore.delete(`${userId}-${deckId}`);
    } catch {}

    // Clean up review logs from Blob
    try {
      const reviewStore = getStore("review-logs");
      await reviewStore.delete(`${userId}-${deckId}`);
    } catch {}

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Delete deck error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
