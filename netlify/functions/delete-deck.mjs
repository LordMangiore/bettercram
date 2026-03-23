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
