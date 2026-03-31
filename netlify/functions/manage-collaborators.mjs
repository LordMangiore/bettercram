import { getDoc, setDoc, deleteDoc, listDocs } from "./lib/firestore.mjs";

/**
 * Manage deck collaborators.
 * POST { action: "add" | "remove" | "list", deckId, targetUserId? }
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
    const { action, deckId, targetUserId } = await req.json();

    if (!deckId) {
      return Response.json({ error: "deckId is required" }, { status: 400 });
    }

    // Load deck metadata
    const deck = await getDoc(`users/${userId}/decks/${deckId}`);
    if (!deck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }

    const collaborators = deck.collaborators || {};

    // ── LIST ──
    if (action === "list") {
      const collabList = [];
      for (const [collabId, info] of Object.entries(collaborators)) {
        const profile = await getDoc(`users/${collabId}`);
        collabList.push({
          userId: collabId,
          username: profile?.username || null,
          name: profile?.name || profile?.email?.split("@")[0] || "User",
          role: info.role,
          addedAt: info.addedAt,
        });
      }
      return Response.json({ collaborators: collabList });
    }

    // ── ADD ──
    if (action === "add") {
      if (!targetUserId) {
        return Response.json({ error: "targetUserId is required" }, { status: 400 });
      }

      if (targetUserId === userId) {
        return Response.json({ error: "You can't add yourself as a collaborator" }, { status: 400 });
      }

      if (collaborators[targetUserId]) {
        return Response.json({ error: "Already a collaborator" }, { status: 400 });
      }

      // Verify target user exists
      const targetProfile = await getDoc(`users/${targetUserId}`);
      if (!targetProfile) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      // Add to collaborators map
      collaborators[targetUserId] = {
        role: "editor",
        addedAt: new Date().toISOString(),
        addedBy: userId,
      };

      // Update deck doc
      await setDoc(`users/${userId}/decks/${deckId}`, {
        ...deck,
        collaborators,
      });

      // Create pointer doc for the collaborator
      await setDoc(`users/${targetUserId}/collabDecks/${userId}_${deckId}`, {
        ownerId: userId,
        deckId,
        deckName: deck.name || "Untitled",
        addedAt: new Date().toISOString(),
      });

      // Create notification for the collaborator
      try {
        await setDoc(`users/${targetUserId}/notifications/${Date.now()}`, {
          type: "collab_invite",
          title: "Deck shared with you",
          message: `You've been added as a collaborator on "${deck.name || "Untitled"}"`,
          deckId,
          ownerId: userId,
          createdAt: new Date().toISOString(),
          read: false,
        });
      } catch {}

      return Response.json({
        success: true,
        collaborator: {
          userId: targetUserId,
          username: targetProfile.username || null,
          name: targetProfile.name || "User",
        },
      });
    }

    // ── REMOVE ──
    if (action === "remove") {
      if (!targetUserId) {
        return Response.json({ error: "targetUserId is required" }, { status: 400 });
      }

      // Allow owner to remove anyone, or user to remove themselves (leave)
      if (targetUserId !== userId) {
        // Only deck owner can remove others
        // (We're already in the owner's deck path since we loaded from users/{userId}/decks)
      }

      if (!collaborators[targetUserId]) {
        return Response.json({ error: "Not a collaborator" }, { status: 400 });
      }

      delete collaborators[targetUserId];

      // Update deck doc
      await setDoc(`users/${userId}/decks/${deckId}`, {
        ...deck,
        collaborators,
      });

      // Delete pointer doc
      try {
        await deleteDoc(`users/${targetUserId}/collabDecks/${userId}_${deckId}`);
      } catch {}

      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action. Use: add, remove, list" }, { status: 400 });
  } catch (err) {
    console.error("Manage collaborators error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
