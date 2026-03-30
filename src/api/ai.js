// AI-powered features — tutor, quiz, deep dive, audio, TTS
import { API_BASE, authHeaders, safeError } from "./client.js";

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

export async function generateQuiz(cards) {
  const res = await fetch(`${API_BASE}/generate-quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to generate quiz"));
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

// Fire-and-forget: precache the first card's podcast audio
export function precacheFirstPodcast(card) {
  if (!card?.front || !card?.back) return;
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
