import { getStore } from "@netlify/blobs";
import { getDoc, setDoc, listDocs } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const deckId = url.searchParams.get("deckId");

    // === Single deck by ID ===
    if (deckId) {
      // Get metadata from Firestore first, fall back to Blob
      let deckMeta = await getDoc(`users/${userId}/decks/${deckId}`);
      let fromBlob = false;

      if (!deckMeta) {
        const store = getStore(`decks-${userId}`);
        try {
          const blobDeck = await store.get(deckId, { type: "json" });
          if (blobDeck) {
            deckMeta = blobDeck;
            fromBlob = true;
          }
        } catch {}
      }

      if (!deckMeta) {
        return Response.json({ deck: null });
      }

      // If reference deck, load cards from public store
      if (deckMeta.isReference && deckMeta.subscribedTo) {
        const publicStore = getStore("public-decks");
        try {
          const publicDeck = await publicStore.get(deckMeta.subscribedTo, { type: "json" });
          if (publicDeck) {
            // Lazy-migrate metadata to Firestore if it came from Blob
            if (fromBlob) {
              try {
                const { cards, ...meta } = deckMeta;
                await setDoc(`users/${userId}/decks/${deckId}`, {
                  ...meta,
                  cardCount: publicDeck.cardCount || publicDeck.cards?.length || 0,
                });
              } catch {}
            }
            return Response.json({
              deck: {
                id: deckId,
                ...deckMeta,
                cards: publicDeck.cards || [],
                cardCount: publicDeck.cardCount || publicDeck.cards?.length || 0,
              },
            });
          }
        } catch {}
        // Public deck was deleted — return empty
        return Response.json({
          deck: { id: deckId, ...deckMeta, cards: [], cardCount: 0, _sourceDeleted: true },
        });
      }

      // Non-reference deck: cards come from Blob (v1 or v2)
      if (fromBlob) {
        // Lazy-migrate metadata to Firestore
        try {
          const { cards, ...meta } = deckMeta;
          await setDoc(`users/${userId}/decks/${deckId}`, {
            ...meta,
            cardCount: deckMeta.cardCount || (deckMeta.cards ? deckMeta.cards.length : 0),
          });
        } catch {}
        return Response.json({ deck: { id: deckId, ...deckMeta } });
      }

      // Metadata from Firestore — load cards from Blob
      const store = getStore(`decks-${userId}`);
      try {
        const blobDeck = await store.get(deckId, { type: "json" });
        if (blobDeck) {
          return Response.json({
            deck: {
              id: deckId,
              ...deckMeta,
              cards: blobDeck.cards || [],
              cardCount: deckMeta.cardCount || blobDeck.cardCount || (blobDeck.cards ? blobDeck.cards.length : 0),
            },
          });
        }
      } catch {}

      // No cards in Blob — return metadata only
      return Response.json({ deck: { id: deckId, ...deckMeta, cards: [] } });
    }

    // === List all decks (summaries, no cards) ===

    // Load collab deck pointers
    let collabDecks = [];
    try {
      const collabPointers = await listDocs(`users/${userId}/collabDecks`);
      if (collabPointers.length > 0) {
        const collabResults = await Promise.allSettled(
          collabPointers.map(async ({ data }) => {
            const deckMeta = await getDoc(`users/${data.ownerId}/decks/${data.deckId}`);
            if (!deckMeta) return null;
            return {
              id: data.deckId,
              ...deckMeta,
              isCollab: true,
              ownerId: data.ownerId,
              ownerName: data.deckName, // We store deckName in the pointer
            };
          })
        );
        collabDecks = collabResults
          .filter(r => r.status === "fulfilled" && r.value)
          .map(r => r.value);
      }
    } catch {}

    // Firestore-first for listing
    let firestoreDecks = [];
    try {
      firestoreDecks = await listDocs(`users/${userId}/decks`);
    } catch {}

    if (firestoreDecks.length > 0) {
      const decks = firestoreDecks.map(({ id, data }) => ({
        id,
        ...data,
      }));
      return Response.json({ decks, collabDecks });
    }

    // Fall back to Blob listing
    const store = getStore(`decks-${userId}`);
    const { blobs } = await store.list();

    const decks = [];
    const migratePromises = [];

    for (const blob of blobs) {
      try {
        const deck = await store.get(blob.key, { type: "json" });
        if (deck) {
          const { cards, ...summary } = deck;
          const deckSummary = {
            id: blob.key,
            ...summary,
            cardCount: deck.cardCount || (cards ? cards.length : 0),
          };
          decks.push(deckSummary);

          migratePromises.push(
            setDoc(`users/${userId}/decks/${blob.key}`, {
              ...summary,
              cardCount: deck.cardCount || (cards ? cards.length : 0),
            }).catch(e => console.error("Lazy-migrate deck to Firestore failed:", e))
          );
        }
      } catch {}
    }

    if (migratePromises.length > 0) {
      Promise.all(migratePromises).catch(() => {});
    }

    return Response.json({ decks, collabDecks });
  } catch (err) {
    console.error("Load decks error:", err);
    return Response.json({ decks: [] });
  }
}
