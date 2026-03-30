import { getStore } from "@netlify/blobs";
import { setDoc } from "./lib/firestore.mjs";

const PAGE_SIZE = 500;

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deckId, meta, cards, progress } = await req.json();
    if (!deckId) {
      return Response.json({ error: "deckId is required" }, { status: 400 });
    }

    const totalPages = cards ? Math.ceil(cards.length / PAGE_SIZE) : 0;

    // Metadata for Firestore
    const firestoreMeta = {
      ...meta,
      v2: true,
      totalPages,
      cardCount: cards ? cards.length : 0,
      updatedAt: new Date().toISOString(),
    };

    // Save meta to Firestore + Blob (dual-write)
    const deckStore = getStore(`decks-${userId}`);
    await Promise.all([
      setDoc(`users/${userId}/decks/${deckId}`, firestoreMeta),
      deckStore.setJSON(deckId, firestoreMeta),
    ]);

    // Save cards in pages of 500 (stays in Blob — deck-cards store)
    if (cards && cards.length > 0) {
      const cardStore = getStore("deck-cards");

      for (let i = 0; i < totalPages; i++) {
        const start = i * PAGE_SIZE;
        const pageCards = cards.slice(start, start + PAGE_SIZE);
        await cardStore.setJSON(`${userId}-${deckId}-page-${i}`, {
          cards: pageCards,
          page: i,
          totalPages,
        });
      }

      // Clean up extra pages if card count decreased
      let extraPage = totalPages;
      while (true) {
        const key = `${userId}-${deckId}-page-${extraPage}`;
        const existing = await cardStore.get(key);
        if (!existing) break;
        await cardStore.delete(key);
        extraPage++;
      }
    }

    // Save progress to Firestore + Blob (dual-write)
    if (progress) {
      const progressData = {
        progress,
        updatedAt: new Date().toISOString(),
      };
      const progressStore = getStore("deck-progress");
      await Promise.all([
        setDoc(`users/${userId}/progress/${deckId}`, progressData),
        progressStore.setJSON(`${userId}-${deckId}`, progressData),
      ]);
    }

    return Response.json({ success: true, totalPages });
  } catch (err) {
    console.error("Save deck v2 error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/save-deck-v2",
};
