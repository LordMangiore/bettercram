import { getDoc, setDoc } from "./lib/firestore.mjs";

/**
 * Accept a deck collaboration invite.
 * POST { token }
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
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: "Invite token is required" }, { status: 400 });
    }

    // Load invite
    const invite = await getDoc(`invites/${token}`);
    if (!invite) {
      return Response.json({ error: "Invalid or expired invite link" }, { status: 404 });
    }

    // Check expiry
    if (new Date(invite.expiresAt) < new Date()) {
      return Response.json({ error: "This invite link has expired" }, { status: 410 });
    }

    // Check max uses
    if (invite.uses >= invite.maxUses) {
      return Response.json({ error: "This invite link has reached its usage limit" }, { status: 410 });
    }

    // Can't accept your own invite
    if (invite.ownerId === userId) {
      return Response.json({ error: "You can't join your own deck" }, { status: 400 });
    }

    // Load the deck
    const deck = await getDoc(`users/${invite.ownerId}/decks/${invite.deckId}`);
    if (!deck) {
      return Response.json({ error: "Deck no longer exists" }, { status: 404 });
    }

    const collaborators = deck.collaborators || {};

    // Check if already a collaborator
    if (collaborators[userId]) {
      return Response.json({
        success: true,
        already: true,
        deckName: deck.name,
        ownerId: invite.ownerId,
        deckId: invite.deckId,
      });
    }

    // Add as collaborator
    collaborators[userId] = {
      role: "editor",
      addedAt: new Date().toISOString(),
      addedBy: "invite",
      inviteToken: token,
    };

    await setDoc(`users/${invite.ownerId}/decks/${invite.deckId}`, {
      ...deck,
      collaborators,
    });

    // Create pointer doc
    await setDoc(`users/${userId}/collabDecks/${invite.ownerId}_${invite.deckId}`, {
      ownerId: invite.ownerId,
      deckId: invite.deckId,
      deckName: deck.name || "Untitled",
      addedAt: new Date().toISOString(),
    });

    // Increment invite uses
    await setDoc(`invites/${token}`, {
      ...invite,
      uses: (invite.uses || 0) + 1,
    });

    // Notify deck owner
    try {
      const joinerProfile = await getDoc(`users/${userId}`);
      const joinerName = joinerProfile?.name || joinerProfile?.username || joinerProfile?.email?.split("@")[0] || "Someone";
      await setDoc(`users/${invite.ownerId}/notifications/${Date.now()}`, {
        type: "collab_joined",
        title: "New collaborator",
        message: `${joinerName} joined "${deck.name || "Untitled"}" via invite link`,
        deckId: invite.deckId,
        createdAt: new Date().toISOString(),
        read: false,
      });
    } catch {}

    return Response.json({
      success: true,
      deckName: deck.name,
      ownerId: invite.ownerId,
      deckId: invite.deckId,
    });
  } catch (err) {
    console.error("Accept invite error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
