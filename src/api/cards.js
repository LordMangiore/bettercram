// Card generation, scoring, and CRUD
import { API_BASE, authHeaders, safeError } from "./client.js";

export async function generateCards(content, category, existingTopics, density) {
  const res = await fetch(`${API_BASE}/generate-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, category, existingTopics, density }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to generate cards"));
  // Response streams keepalive spaces then JSON on the last line
  const text = await res.text();
  const jsonStr = text.trim().split("\n").pop();
  return JSON.parse(jsonStr);
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
