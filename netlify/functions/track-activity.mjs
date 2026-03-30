import { getDoc, setDoc, listDocs } from "./lib/firestore.mjs";

/**
 * Track daily study activity.
 *
 * POST: Increment today's activity doc with review count
 * GET: Return activity data for a date range
 *
 * Firestore path: users/{userId}/activity/{YYYY-MM-DD}
 */
export default async function handler(req) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (req.method === "POST") {
    try {
      const { reviews = 0, correct = 0, deckId } = await req.json();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Load existing activity for today
      let existing = await getDoc(`users/${userId}/activity/${today}`);
      if (!existing) {
        existing = { reviews: 0, correct: 0, decks: [], date: today };
      }

      // Merge
      existing.reviews = (existing.reviews || 0) + reviews;
      existing.correct = (existing.correct || 0) + correct;
      if (deckId && !existing.decks?.includes(deckId)) {
        existing.decks = [...(existing.decks || []), deckId];
      }
      existing.updatedAt = new Date().toISOString();

      await setDoc(`users/${userId}/activity/${today}`, existing);
      return Response.json({ success: true, today: existing });
    } catch (err) {
      console.error("Track activity error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const days = parseInt(url.searchParams.get("days") || "180");

      // List all activity docs
      const allDocs = await listDocs(`users/${userId}/activity`);

      // Filter to requested range
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const activity = allDocs
        .filter(d => d.id >= cutoffStr)
        .map(d => ({ date: d.id, ...d.data }));

      return Response.json({ activity });
    } catch (err) {
      console.error("Load activity error:", err);
      return Response.json({ activity: [] });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
