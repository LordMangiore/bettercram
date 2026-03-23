import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");
    let userId = "default";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.sub || "default";
      } catch {}
    }

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
