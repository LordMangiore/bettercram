import { getStore } from "@netlify/blobs";
import { setDoc } from "./lib/firestore.mjs";
import { createNotification } from "./lib/notifications.mjs";

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const userId = req.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { publicDeckId, type, cardId, front, back, category, reason } = await req.json();

    if (!publicDeckId || !type || !front) {
      return Response.json({ error: "publicDeckId, type, and front required" }, { status: 400 });
    }

    // Load public deck to get the owner
    const store = getStore("public-decks");
    const publicDeck = await store.get(publicDeckId, { type: "json" });
    if (!publicDeck) {
      return Response.json({ error: "Public deck not found" }, { status: 404 });
    }

    const ownerId = publicDeck.author?.id;
    if (!ownerId) {
      return Response.json({ error: "Deck has no owner" }, { status: 400 });
    }

    if (ownerId === userId) {
      return Response.json({ error: "You can edit your own deck directly" }, { status: 400 });
    }

    // Get submitter name
    let submitterName = userId;
    try {
      const { getDoc } = await import("./lib/firestore.mjs");
      const profile = await getDoc(`users/${userId}`);
      if (profile?.name) submitterName = profile.name;
    } catch {}

    const suggestionId = "sug-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

    const suggestion = {
      type, // "edit" or "new"
      cardId: type === "edit" ? cardId : null,
      front,
      back: back || "",
      category: category || "General",
      originalFront: null,
      originalBack: null,
      reason: reason || null,
      submittedBy: { id: userId, name: submitterName },
      submittedAt: new Date().toISOString(),
      status: "pending",
      reviewedAt: null,
    };

    // If editing, get original card content
    if (type === "edit" && cardId != null && publicDeck.cards) {
      const original = publicDeck.cards[cardId] || publicDeck.cards.find(c => c.id === cardId || c.front?.slice(0, 60) === cardId);
      if (original) {
        suggestion.originalFront = original.front;
        suggestion.originalBack = original.back;
      }
    }

    // Store suggestion under deck owner
    await setDoc(`users/${ownerId}/deckSuggestions/${publicDeckId}/items/${suggestionId}`, suggestion);

    // Notify deck owner
    await createNotification(ownerId, {
      type: "suggestion_received",
      title: `New suggestion for "${publicDeck.name}"`,
      body: type === "new"
        ? `${submitterName} suggested a new card`
        : `${submitterName} suggested editing a card`,
      data: { publicDeckId, suggestionId, deckName: publicDeck.name },
    });

    return Response.json({ success: true, suggestionId });
  } catch (err) {
    console.error("Submit suggestion error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
