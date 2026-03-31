import { getDoc, setDoc, deleteDoc } from "./lib/firestore.mjs";

/**
 * Create or revoke invite links for deck collaboration.
 * POST { action: "create" | "revoke", deckId, token? }
 */
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, deckId, token } = await req.json();

    if (!deckId) {
      return Response.json({ error: "deckId is required" }, { status: 400 });
    }

    // Verify deck ownership
    const deck = await getDoc(`users/${userId}/decks/${deckId}`);
    if (!deck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }

    if (action === "create") {
      // Generate a 12-char alphanumeric token
      const inviteToken = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

      await setDoc(`invites/${inviteToken}`, {
        ownerId: userId,
        deckId,
        deckName: deck.name || "Untitled",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        createdBy: userId,
        maxUses: 10,
        uses: 0,
      });

      const inviteUrl = `https://bettercram.com?invite=${inviteToken}`;
      return Response.json({ success: true, token: inviteToken, url: inviteUrl });
    }

    if (action === "revoke") {
      if (!token) {
        return Response.json({ error: "token is required for revoke" }, { status: 400 });
      }

      // Verify the invite belongs to this user
      const invite = await getDoc(`invites/${token}`);
      if (!invite || invite.ownerId !== userId) {
        return Response.json({ error: "Invite not found or not owned by you" }, { status: 404 });
      }

      await deleteDoc(`invites/${token}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action. Use: create, revoke" }, { status: 400 });
  } catch (err) {
    console.error("Manage invite link error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
