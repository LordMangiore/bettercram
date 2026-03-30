import { getStore } from "@netlify/blobs";
import { getDoc, setDoc, listDocs } from "./lib/firestore.mjs";
import { createNotification } from "./lib/notifications.mjs";

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const userId = req.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { publicDeckId, suggestionId, action } = await req.json();

    if (!publicDeckId || !suggestionId || !["approve", "reject"].includes(action)) {
      return Response.json({ error: "publicDeckId, suggestionId, and action (approve/reject) required" }, { status: 400 });
    }

    // Verify requester is the deck owner
    const store = getStore("public-decks");
    const publicDeck = await store.get(publicDeckId, { type: "json" });
    if (!publicDeck || publicDeck.author?.id !== userId) {
      return Response.json({ error: "Only the deck owner can review suggestions" }, { status: 403 });
    }

    // Load suggestion
    const suggestion = await getDoc(`users/${userId}/deckSuggestions/${publicDeckId}/items/${suggestionId}`);
    if (!suggestion) {
      return Response.json({ error: "Suggestion not found" }, { status: 404 });
    }

    // Update suggestion status
    await setDoc(`users/${userId}/deckSuggestions/${publicDeckId}/items/${suggestionId}`, {
      ...suggestion,
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt: new Date().toISOString(),
    });

    // If approved, update the public deck
    if (action === "approve") {
      if (suggestion.type === "new") {
        // Add new card
        publicDeck.cards = publicDeck.cards || [];
        publicDeck.cards.push({
          front: suggestion.front,
          back: suggestion.back,
          category: suggestion.category,
          difficulty: "medium",
          suggestedBy: suggestion.submittedBy.name,
        });
        publicDeck.cardCount = publicDeck.cards.length;
      } else if (suggestion.type === "edit" && suggestion.cardId != null) {
        // Edit existing card
        const idx = typeof suggestion.cardId === "number" ? suggestion.cardId : publicDeck.cards?.findIndex(c => c.id === suggestion.cardId || c.front?.slice(0, 60) === suggestion.cardId);
        if (idx >= 0 && publicDeck.cards[idx]) {
          publicDeck.cards[idx].front = suggestion.front;
          publicDeck.cards[idx].back = suggestion.back;
          if (suggestion.category) publicDeck.cards[idx].category = suggestion.category;
        }
      }

      publicDeck.updatedAt = new Date().toISOString();
      await store.setJSON(publicDeckId, publicDeck);
    }

    // Notify the submitter
    await createNotification(suggestion.submittedBy.id, {
      type: "deck_updated",
      title: action === "approve"
        ? `Your suggestion was approved!`
        : `Your suggestion was not accepted`,
      body: `For "${publicDeck.name}": ${suggestion.front.slice(0, 60)}`,
      data: { publicDeckId, suggestionId },
    });

    return Response.json({ success: true, action });
  } catch (err) {
    console.error("Review suggestion error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
