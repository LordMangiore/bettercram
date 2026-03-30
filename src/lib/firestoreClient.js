/**
 * Direct Firestore reads from the client.
 * Bypasses Netlify functions for read-only operations — instant, cached, real-time capable.
 * Writes still go through Netlify functions (validation, dual-write to Blobs).
 */
import { db } from "./firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

/**
 * Load user profile directly from Firestore
 */
export async function getProfile(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Firestore getProfile failed:", err);
    return null;
  }
}

/**
 * Load all deck metadata for a user (no cards — just summaries)
 */
export async function getDecks(userId) {
  try {
    const snap = await getDocs(collection(db, "users", userId, "decks"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Firestore getDecks failed:", err);
    return null; // null signals fallback to API
  }
}

/**
 * Subscribe to real-time deck list updates.
 * Returns an unsubscribe function.
 */
export function onDecksChanged(userId, callback) {
  return onSnapshot(
    collection(db, "users", userId, "decks"),
    (snap) => {
      const decks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(decks);
    },
    (err) => {
      console.error("Firestore deck listener error:", err);
    }
  );
}

/**
 * Load progress for a specific deck
 */
export async function getDeckProgress(userId, deckId) {
  try {
    const snap = await getDoc(doc(db, "users", userId, "progress", deckId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.progress || data;
  } catch (err) {
    console.error("Firestore getDeckProgress failed:", err);
    return null;
  }
}

/**
 * Load study plan
 */
export async function getStudyPlan(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId, "studyPlan", "current"));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Firestore getStudyPlan failed:", err);
    return null;
  }
}

/**
 * Load deck groups config
 */
export async function getDeckGroups(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId, "deckGroups", "config"));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Firestore getDeckGroups failed:", err);
    return null;
  }
}

/**
 * Subscribe to real-time deck group changes
 */
export function onDeckGroupsChanged(userId, callback) {
  return onSnapshot(
    doc(db, "users", userId, "deckGroups", "config"),
    (snap) => {
      callback(snap.exists() ? snap.data() : null);
    },
    (err) => {
      console.error("Firestore deck groups listener error:", err);
    }
  );
}

/**
 * Subscribe to real-time notifications
 */
export function onNotificationsChanged(userId, callback) {
  return onSnapshot(
    query(collection(db, "users", userId, "notifications"), orderBy("createdAt", "desc")),
    (snap) => {
      const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(notifications);
    },
    (err) => {
      // orderBy might fail if index doesn't exist — fall back to unordered
      console.error("Firestore notifications listener error:", err);
      onSnapshot(
        collection(db, "users", userId, "notifications"),
        (snap) => {
          const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          notifications.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
          callback(notifications);
        },
        () => {}
      );
    }
  );
}
