import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "GET") {
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

    const store = getStore(`decks-${userId}`);
    const { blobs } = await store.list();

    const decks = [];
    for (const blob of blobs) {
      try {
        const deck = await store.get(blob.key, { type: "json" });
        if (deck) {
          decks.push({ id: blob.key, ...deck });
        }
      } catch {}
    }

    return Response.json({ decks });
  } catch (err) {
    console.error("Load decks error:", err);
    return Response.json({ decks: [] });
  }
}
