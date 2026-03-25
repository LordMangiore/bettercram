import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id") || "default";

    // Clear all deck data for this user
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

    return Response.json({ ok: true, cleared: blobs.length, userId });
  } catch (err) {
    console.error("Reset error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
