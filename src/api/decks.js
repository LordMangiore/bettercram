// Deck management — CRUD, groups, progress, sharing
import { API_BASE, authHeaders, safeError } from "./client.js";

export async function loadDecks() {
  const res = await fetch(`${API_BASE}/load-decks`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load decks"));
  return res.json();
}

export async function loadDeck(deckId) {
  const res = await fetch(`${API_BASE}/load-decks?deckId=${encodeURIComponent(deckId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load deck"));
  return res.json();
}

export async function saveDeck(deckId, deck) {
  const res = await fetch(`${API_BASE}/save-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId, deck }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save deck"));
  return res.json();
}

export async function saveDeckV2(deckId, { meta, cards, progress, pageOffset }) {
  const res = await fetch(`${API_BASE}/save-deck-v2`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId, meta, cards, progress, pageOffset }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save deck"));
  return res.json();
}

export async function deleteDeck(deckId) {
  const res = await fetch(`${API_BASE}/delete-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to delete deck"));
  return res.json();
}

export async function seedSampleDecks() {
  const res = await fetch(`${API_BASE}/seed-sample-decks`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to seed decks"));
  return res.json();
}

// Paginated card loading
export async function loadDeckCards(deckId, page = 0) {
  const res = await fetch(`${API_BASE}/load-deck-cards?deckId=${deckId}&page=${page}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load cards"));
  return res.json();
}

export async function loadAllDeckCards(deckId) {
  // Load pages until we get an empty result — don't rely on totalPages
  // from individual page blobs (may be stale from chunked saves)
  const allCards = [];
  const PARALLEL = 10;
  let page = 0;
  let keepGoing = true;

  while (keepGoing) {
    const batch = await Promise.all(
      Array.from({ length: PARALLEL }, (_, i) =>
        loadDeckCards(deckId, page + i).catch(() => ({ cards: [] }))
      )
    );
    for (const result of batch) {
      if (result.cards && result.cards.length > 0) {
        allCards.push(...result.cards);
      } else {
        keepGoing = false;
        break;
      }
    }
    page += PARALLEL;
  }

  return allCards;
}

// Progress
export async function loadDeckProgress(deckId) {
  const res = await fetch(`${API_BASE}/load-deck-progress?deckId=${deckId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load progress"));
  return res.json();
}

export async function saveDeckProgress(deckId, progress) {
  const res = await fetch(`${API_BASE}/save-deck-progress`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId, progress }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save progress"));
  return res.json();
}

// Groups
export async function saveDeckGroups(groups) {
  const res = await fetch(`${API_BASE}/save-deck-groups`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ groups }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save deck groups"));
  return res.json();
}

export async function assignDeckGroup(deckId, groupId) {
  const res = await fetch(`${API_BASE}/save-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId, deck: { group: groupId || null } }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to assign deck group"));
  return res.json();
}

// Public sharing
export async function publishDeck(deckId, action = "publish", userInfo = null) {
  const res = await fetch(`${API_BASE}/publish-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId, action, userInfo }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to publish deck"));
  return res.json();
}

export async function browsePublicDecks() {
  const res = await fetch(`${API_BASE}/browse-decks`);
  if (!res.ok) throw new Error(await safeError(res, "Failed to browse decks"));
  return res.json();
}

export async function subscribeToDeck(publicDeckId) {
  const res = await fetch(`${API_BASE}/copy-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ publicDeckId, action: "subscribe" }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to add deck"));
  return res.json();
}

export async function cloneDeck(publicDeckId) {
  const res = await fetch(`${API_BASE}/copy-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ publicDeckId, action: "clone" }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to clone deck"));
  return res.json();
}

export const copyPublicDeck = subscribeToDeck;

export async function upvotePublicDeck(publicDeckId) {
  const res = await fetch(`${API_BASE}/upvote-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ publicDeckId }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to upvote deck"));
  return res.json();
}

// Suggestions
export async function submitSuggestion(publicDeckId, suggestion) {
  const res = await fetch(`${API_BASE}/submit-suggestion`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ publicDeckId, ...suggestion }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to submit suggestion"));
  return res.json();
}

export async function listSuggestions(publicDeckId, status = null) {
  const params = new URLSearchParams({ publicDeckId });
  if (status) params.set("status", status);
  const res = await fetch(`${API_BASE}/list-suggestions?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return { suggestions: [], isOwner: false };
  return res.json();
}

export async function reviewSuggestion(publicDeckId, suggestionId, action) {
  const res = await fetch(`${API_BASE}/review-suggestion`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ publicDeckId, suggestionId, action }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to review suggestion"));
  return res.json();
}
