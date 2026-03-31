import { getStore } from "@netlify/blobs";
import { getDoc, setDoc } from "./lib/firestore.mjs";

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

    const { deckId, meta, cards, progress, pageOffset = 0, ownerId } = await req.json();
    if (!deckId) {
      return Response.json({ error: "deckId is required" }, { status: 400 });
    }

    // Determine effective owner (for collaborator writes)
    let effectiveOwner = userId;
    if (ownerId && ownerId !== userId) {
      const ownerDeck = await getDoc(`users/${ownerId}/decks/${deckId}`);
      if (!ownerDeck?.collaborators?.[userId]) {
        return Response.json({ error: "Not authorized to edit this deck" }, { status: 403 });
      }
      effectiveOwner = ownerId;
    }

    const totalPages = cards ? Math.ceil(cards.length / PAGE_SIZE) : 0;

    const firestoreMeta = {
      ...meta,
      v2: true,
      totalPages: meta?.totalPages || totalPages,
      cardCount: meta?.cardCount || (cards ? cards.length : 0),
      updatedAt: new Date().toISOString(),
    };

    const deckStore = getStore(`decks-${effectiveOwner}`);
    await Promise.all([
      setDoc(`users/${effectiveOwner}/decks/${deckId}`, firestoreMeta),
      deckStore.setJSON(deckId, firestoreMeta),
    ]);

    if (cards && cards.length > 0) {
      const cardStore = getStore("deck-cards");

      for (let i = 0; i < totalPages; i++) {
        const start = i * PAGE_SIZE;
        const pageCards = cards.slice(start, start + PAGE_SIZE);
        await cardStore.setJSON(`${effectiveOwner}-${deckId}-page-${pageOffset + i}`, {
          cards: pageCards,
          page: i,
          totalPages,
        });
      }

      if (pageOffset === 0) {
        let extraPage = totalPages;
        while (true) {
          const key = `${effectiveOwner}-${deckId}-page-${extraPage}`;
          const existing = await cardStore.get(key);
          if (!existing) break;
          await cardStore.delete(key);
          extraPage++;
        }
      }
    }

    // Progress is always per-user (not shared)
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
