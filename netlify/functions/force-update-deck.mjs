import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { userId, deckId, cards } = await req.json();
  if (!userId || !deckId || !cards) return Response.json({ error: "missing params" }, { status: 400 });

  const store = getStore(`decks-${userId}`);
  const existing = await store.get(deckId, { type: "json" });
  if (!existing) return Response.json({ error: "deck not found" }, { status: 404 });

  existing.cards = cards;
  existing.cardCount = cards.length;
  await store.setJSON(deckId, existing);

  // Also update public copy if published
  if (existing.isPublic && existing.publicId) {
    const pubStore = getStore("public-decks");
    try {
      const pub = await pubStore.get(existing.publicId, { type: "json" });
      if (pub) {
        pub.cards = cards;
        pub.cardCount = cards.length;
        await pubStore.setJSON(existing.publicId, pub);
      }
    } catch {}
  }

  return Response.json({ ok: true, cardCount: cards.length });
}
