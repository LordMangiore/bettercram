const API_BASE = "/.netlify/functions";

let _authToken = null;
export function setAuthToken(token) {
  _authToken = token;
}

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (_authToken) h["Authorization"] = `Bearer ${_authToken}`;
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

export async function scrapeDocument(url) {
  const res = await fetch(`${API_BASE}/scrape-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to scrape document"));
  return res.json();
}

export async function generateCards(content, category) {
  const res = await fetch(`${API_BASE}/generate-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, category }),
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

export async function tutorChat(card, action, messages) {
  const res = await fetch(`${API_BASE}/tutor-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, action, messages }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to get tutor response"));
  return res.json();
}

export async function deepDive(card, query) {
  const res = await fetch(`${API_BASE}/deep-dive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, query }),
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
