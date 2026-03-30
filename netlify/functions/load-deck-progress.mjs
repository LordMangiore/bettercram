import { getStore } from "@netlify/blobs";
import { getDoc, setDoc } from "./lib/firestore.mjs";

export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const deckId = url.searchParams.get("deckId");

    if (!deckId) {
      return Response.json({ error: "deckId is required" }, { status: 400 });
    }

    // Firestore-first
    const firestoreData = await getDoc(`users/${userId}/progress/${deckId}`);
    if (firestoreData) {
      return Response.json({ progress: firestoreData.progress || firestoreData });
    }

    // Fall back to Blob v2 progress store
    const progressStore = getStore("deck-progress");
    const progressData = await progressStore.get(`${userId}-${deckId}`, { type: "json" });

    if (progressData) {
      // Lazy-migrate to Firestore
      try {
        await setDoc(`users/${userId}/progress/${deckId}`, progressData);
      } catch (e) {
        console.error("Lazy-migrate progress to Firestore failed:", e);
      }
      return Response.json({ progress: progressData.progress || progressData });
    }

    // V1 fallback: load progress from full deck blob
    const deckStore = getStore(`decks-${userId}`);
    const deck = await deckStore.get(deckId, { type: "json" });

    if (deck && deck.progress) {
      // Lazy-migrate to Firestore
      try {
        await setDoc(`users/${userId}/progress/${deckId}`, {
          progress: deck.progress,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Lazy-migrate v1 progress to Firestore failed:", e);
      }
      return Response.json({ progress: deck.progress });
    }

    return Response.json({ progress: {} });
  } catch (err) {
    console.error("Load deck progress error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/load-deck-progress",
};
