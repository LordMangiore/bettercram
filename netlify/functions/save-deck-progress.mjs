import { getStore } from "@netlify/blobs";
import { setDoc, getDoc } from "./lib/firestore.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deckId, progress } = await req.json();
    if (!deckId || !progress) {
      return Response.json({ error: "deckId and progress required" }, { status: 400 });
    }

    const progressData = {
      progress,
      updatedAt: new Date().toISOString(),
    };

    // Write progress to Firestore only (fast, indexed, cached by client)
    // Blob writes happen on explicit deck save, not every 3-second progress tick
    await setDoc(`users/${userId}/progress/${deckId}`, progressData);

    // Update lastStudied on Firestore deck doc
    try {
      const deckMeta = await getDoc(`users/${userId}/decks/${deckId}`);
      if (deckMeta) {
        await setDoc(`users/${userId}/decks/${deckId}`, {
          ...deckMeta,
          lastStudied: new Date().toISOString(),
        });
      }
    } catch {}

    return Response.json({ success: true });
  } catch (err) {
    console.error("Save deck progress error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/save-deck-progress",
};
