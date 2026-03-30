// Shared API client utilities — used by all domain modules
export const API_BASE = "/.netlify/functions";

let _authToken = null;
let _userId = null;

export function setAuthToken(token) {
  _authToken = token;
}

export function setUserId(id) {
  _userId = id;
}

export function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (_authToken) h["Authorization"] = `Bearer ${_authToken}`;
  if (_userId) h["X-User-Id"] = _userId;
  return h;
}

export async function safeError(res, fallback) {
  try {
    const text = await res.text();
    const json = JSON.parse(text);
    return json.error || fallback;
  } catch {
    if (res.status === 502) return `${fallback} (server timeout — try fewer items)`;
    return `${fallback} (HTTP ${res.status})`;
  }
}
