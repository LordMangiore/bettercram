const API_BASE = "/.netlify/functions";

let _authToken = null;
let _userId = null;
export function setAuthToken(token) {
  _authToken = token;
}
export function setUserId(id) {
  _userId = id;
}

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (_authToken) h["Authorization"] = `Bearer ${_authToken}`;
  if (_userId) h["X-User-Id"] = _userId;
  return h;
}

async function safeError(res, fallback) {
  try {
    const text = await res.text();
    const json = JSON.parse(text);
    return json.error || fallback;
  } catch {
    if (res.status === 502) return `${fallback} (server timeout — try fewer items)`;
    return `${fallback} (HTTP ${res.status})`;
  }
}

export async function readGoogleDoc(docId, accessToken) {
  const res = await fetch(`${API_BASE}/read-google-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, accessToken }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to read Google Doc"));
  return res.json();
}

export async function scrapeDocument(url, onStatus) {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (onStatus && attempt > 1) {
      onStatus(`Large document — retry ${attempt}/${MAX_ATTEMPTS} (extended timeout)...`);
    }

    try {
      const res = await fetch(`${API_BASE}/scrape-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, attempt }),
      });

      if (res.ok) {
        const data = await res.json();

        // Success — got content
        if (data.content && data.content.length > 50) return data;

        // Firecrawl timeout — retry with next attempt
        if (data.status === "retry") {
          if (onStatus) onStatus(data.message || "Retrying large document...");
          continue;
        }
      }

      // Non-OK response
      const errData = await res.json().catch(() => ({}));
      if (attempt < MAX_ATTEMPTS && (res.status === 504 || res.status === 502)) {
        if (onStatus) onStatus(`Server timeout — retry ${attempt + 1}/${MAX_ATTEMPTS}...`);
        continue;
      }

      throw new Error(errData.error || "Failed to scrape document. Make sure it's shared publicly.");
    } catch (e) {
      if (attempt < MAX_ATTEMPTS && (e.message.includes("timeout") || e.message.includes("Failed to fetch"))) {
        if (onStatus) onStatus(`Connection issue — retry ${attempt + 1}/${MAX_ATTEMPTS}...`);
        continue;
      }
      throw e;
    }
  }

  throw new Error("Document is too large to process. Try splitting it into smaller documents.");
}

// === Firecrawl-powered features ===

export async function searchAndScrape(topic) {
  const res = await fetch(`${API_BASE}/search-and-scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to search topic"));
  return res.json();
}

export async function crawlStart(url, limit = 25) {
  const res = await fetch(`${API_BASE}/crawl-start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to start crawl"));
  return res.json();
}

export async function crawlPoll(jobId) {
  const res = await fetch(`${API_BASE}/crawl-poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to check crawl status"));
  return res.json();
}

export async function extractCards(url) {
  const res = await fetch(`${API_BASE}/extract-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to extract cards"));
  return res.json();
}

export async function generateHelperCards(card) {
  const res = await fetch(`${API_BASE}/generate-helper-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card }),
  });
  if (!res.ok) return { cards: [] }; // fail silently
  return res.json();
}

export async function regenCard(card, style = "default") {
  const res = await fetch(`${API_BASE}/regen-card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, style }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to regenerate card"));
  return res.json();
}

export async function scoreCards(cards) {
  const res = await fetch(`${API_BASE}/score-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
  if (!res.ok) return { cards, removed: 0, improved: 0 }; // fail silently
  return res.json();
}

export async function generateCards(content, category, existingTopics) {
  const res = await fetch(`${API_BASE}/generate-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, category, existingTopics }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to generate cards"));
  return res.json();
}

const _ttsCache = new Map();
const _ttsPending = new Map();

export async function textToSpeech(text) {
  const key = text.slice(0, 100);
  if (_ttsCache.has(key)) return _ttsCache.get(key);
  if (_ttsPending.has(key)) return _ttsPending.get(key);

  const promise = (async () => {
    const res = await fetch(`${API_BASE}/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(await safeError(res, "Failed to generate speech"));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    _ttsCache.set(key, url);
    _ttsPending.delete(key);
    return url;
  })();

  _ttsPending.set(key, promise);
  return promise;
}

export async function saveCards(cards, progress) {
  const res = await fetch(`${API_BASE}/save-cards`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ cards, progress }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save cards"));
  return res.json();
}

export async function loadCards() {
  const res = await fetch(`${API_BASE}/load-cards`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load cards"));
  return res.json();
}

export async function generateMore(existingCards, content) {
  const res = await fetch(`${API_BASE}/generate-more`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ existingCards, content }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to generate more cards"));
  return res.json();
}

export async function tutorChat(card, action, messages, deckName) {
  const res = await fetch(`${API_BASE}/tutor-chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ card, action, messages, deckName }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to get tutor response"));
  return res.json();
}

export async function deepDive(card, query, deckName) {
  const res = await fetch(`${API_BASE}/deep-dive`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ card, query, deckName }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to research topic"));
  return res.json();
}

export async function audioSession(card, mode) {
  const res = await fetch(`${API_BASE}/audio-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, mode }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to generate audio"));
  const scriptText = decodeURIComponent(res.headers.get("X-Script-Text") || "");
  const blob = await res.blob();
  return { audioUrl: URL.createObjectURL(blob), script: scriptText };
}

export async function saveStudyPlan(plan) {
  const res = await fetch(`${API_BASE}/save-study-plan`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save study plan"));
  return res.json();
}

export async function loadStudyPlan() {
  const res = await fetch(`${API_BASE}/load-study-plan`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load study plan"));
  return res.json();
}

export async function generateQuiz(cards) {
  const res = await fetch(`${API_BASE}/generate-quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to generate quiz"));
  return res.json();
}

// Stripe / Subscription
export async function checkSubscription(email) {
  const res = await fetch(`${API_BASE}/check-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to check subscription"));
  return res.json();
}

export async function createCheckout(priceKey, email) {
  const res = await fetch(`${API_BASE}/create-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceKey,
      email,
      successUrl: `${window.location.origin}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}?canceled=true`,
    }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to create checkout"));
  return res.json();
}

// Deck library
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

export async function seedSampleDecks() {
  const res = await fetch(`${API_BASE}/seed-sample-decks`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to seed decks"));
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

export async function resetAccount() {
  const res = await fetch(`${API_BASE}/reset-account`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to reset account"));
  return res.json();
}

export async function manageSubscription(email) {
  const res = await fetch(`${API_BASE}/manage-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      returnUrl: window.location.origin,
    }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to open billing portal"));
  return res.json();
}

// Public deck sharing
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

// Keep old name for backward compat
export const copyPublicDeck = subscribeToDeck;

// Fire-and-forget: precache the first card's podcast audio
export function precacheFirstPodcast(card) {
  if (!card?.front || !card?.back) return;
  // Don't await — this runs in the background
  fetch(`${API_BASE}/audio-session`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ card, mode: "podcast" }),
  }).then(() => {
    console.log("Precached first podcast for:", card.front.slice(0, 40));
  }).catch(() => {
    // Silent fail — precache is best-effort
  });
}

export async function upvotePublicDeck(publicDeckId) {
  const res = await fetch(`${API_BASE}/upvote-deck`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ publicDeckId }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to upvote deck"));
  return res.json();
}
