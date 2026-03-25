import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id") || "default";

    const { deckId, deck } = await req.json();
    if (!deckId || !deck) {
      return Response.json({ error: "deckId and deck required" }, { status: 400 });
    }

    const store = getStore(`decks-${userId}`);
    await store.setJSON(deckId, deck);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Save deck error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
