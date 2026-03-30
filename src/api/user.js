// User account — profile, subscription, activity, study plan
import { API_BASE, authHeaders, safeError } from "./client.js";

// Profile
export async function saveProfile(profile) {
  const res = await fetch(`${API_BASE}/save-profile`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save profile"));
  return res.json();
}

export async function loadProfile() {
  const res = await fetch(`${API_BASE}/load-profile`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load profile"));
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

// Subscription (Stripe)
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

// Study plan
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

// Activity tracking
export async function trackActivity(reviews, correct, deckId) {
  try {
    await fetch(`${API_BASE}/track-activity`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ reviews, correct, deckId }),
    });
  } catch {} // fire and forget
}

export async function loadActivity(days = 180) {
  const res = await fetch(`${API_BASE}/track-activity?days=${days}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return { activity: [] };
  return res.json();
}

// Review logging
export async function saveReviewEvents(deckId, events) {
  const res = await fetch(`${API_BASE}/review-log`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId, events }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to save review log"));
  return res.json();
}

export async function loadReviewLog(deckId) {
  const res = await fetch(`${API_BASE}/review-log?deckId=${deckId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to load review log"));
  return res.json();
}

// FSRS optimization
export async function optimizeFSRS(deckId, targetRetention) {
  const res = await fetch(`${API_BASE}/optimize-fsrs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId, targetRetention }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to optimize FSRS"));
  return res.json();
}

export async function loadFSRSParams(deckId) {
  const res = await fetch(`${API_BASE}/optimize-fsrs?deckId=${deckId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}
