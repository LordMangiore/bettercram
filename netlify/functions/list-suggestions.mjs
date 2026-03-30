import { getStore } from "@netlify/blobs";
import { listDocs } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const userId = req.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const publicDeckId = url.searchParams.get("publicDeckId");
    const status = url.searchParams.get("status"); // "pending", "approved", "rejected", or null for all

    if (!publicDeckId) {
      return Response.json({ error: "publicDeckId required" }, { status: 400 });
    }

    // Get deck owner
    const store = getStore("public-decks");
    const publicDeck = await store.get(publicDeckId, { type: "json" });
    if (!publicDeck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }

    const ownerId = publicDeck.author?.id;

    // Only owner can see all suggestions; subscribers can see their own
    const isOwner = userId === ownerId;

    const docs = await listDocs(`users/${ownerId}/deckSuggestions/${publicDeckId}/items`);

    let suggestions = docs.map(d => ({ id: d.id, ...d.data }));

    // Filter by status if specified
    if (status) {
      suggestions = suggestions.filter(s => s.status === status);
    }

    // Non-owners only see their own suggestions
    if (!isOwner) {
      suggestions = suggestions.filter(s => s.submittedBy?.id === userId);
    }

    // Sort newest first
    suggestions.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

    return Response.json({ suggestions, isOwner });
  } catch (err) {
    console.error("List suggestions error:", err);
    return Response.json({ suggestions: [], isOwner: false });
  }
}
