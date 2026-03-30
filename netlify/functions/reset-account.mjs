import { getStore } from "@netlify/blobs";
import { deleteDoc, deleteCollection } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Delete all Firestore collections for this user
    await Promise.all([
      deleteCollection(`users/${userId}/decks`),
      deleteCollection(`users/${userId}/progress`),
      deleteCollection(`users/${userId}/reviewLogs`),
      deleteDoc(`users/${userId}`),
    ]);

    // Clear all Blob data (backup cleanup)
    const deckStore = getStore(`decks-${userId}`);
    const { blobs } = await deckStore.list();
    for (const blob of blobs) {
      await deckStore.delete(blob.key);
    }

    // Clear old card data
    const cardStore = getStore("user-cards");
    try { await cardStore.delete(userId); } catch {}

    // Clear study plan
    const planStore = getStore("study-plans");
    try { await planStore.delete(userId); } catch {}

    // Clear study plan from flashcards store (legacy)
    const flashcardsStore = getStore("flashcards");
    try { await flashcardsStore.delete(`${userId}-study-plan`); } catch {}

    return Response.json({ ok: true, cleared: blobs.length, userId });
  } catch (err) {
    console.error("Reset error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
