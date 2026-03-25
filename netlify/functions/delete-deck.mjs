import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id") || "default";

    const { deckId } = await req.json();
    if (!deckId) {
      return Response.json({ error: "deckId required" }, { status: 400 });
    }

    const store = getStore(`decks-${userId}`);
    await store.delete(deckId);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Delete deck error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
