import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const publicStore = getStore("public-decks");
    const { blobs } = await publicStore.list();

    // Load all public decks
    const allDecks = [];
    for (const blob of blobs) {
      try {
        const deck = await publicStore.get(blob.key, { type: "json" });
        if (deck) {
          allDecks.push({ key: blob.key, ...deck });
        }
      } catch {}
    }

    // Group by normalized name
    const groups = {};
    for (const deck of allDecks) {
      const normalizedName = (deck.name || "").trim().toLowerCase();
      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }
      groups[normalizedName].push(deck);
    }

    const summary = {
      totalDecks: allDecks.length,
      duplicateGroups: 0,
      deleted: [],
      kept: [],
    };

    for (const [name, decks] of Object.entries(groups)) {
      if (decks.length <= 1) continue;

      summary.duplicateGroups++;

      // Sort by copies + upvotes descending — keep the one with most engagement
      decks.sort((a, b) => {
        const scoreA = (a.copies || 0) + (a.upvotes || 0);
        const scoreB = (b.copies || 0) + (b.upvotes || 0);
        return scoreB - scoreA;
      });

      const keeper = decks[0];
      summary.kept.push({
        key: keeper.key,
        name: keeper.name,
        copies: keeper.copies || 0,
        upvotes: keeper.upvotes || 0,
      });

      // Delete the rest
      for (let i = 1; i < decks.length; i++) {
        const dupe = decks[i];
        await publicStore.delete(dupe.key);
        summary.deleted.push({
          key: dupe.key,
          name: dupe.name,
          copies: dupe.copies || 0,
          upvotes: dupe.upvotes || 0,
        });
      }
    }

    return Response.json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
