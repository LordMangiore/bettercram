import { getStore } from "@netlify/blobs";
import { getDoc, setDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Auth required" }, { status: 401 });

  if (req.method === "POST") {
    // Append review events
    try {
      const { deckId, events } = await req.json();
      if (!deckId || !events?.length) {
        return Response.json({ error: "deckId and events required" }, { status: 400 });
      }

      const firestorePath = `users/${userId}/reviewLogs/${deckId}`;
      const blobStore = getStore("review-logs");
      const blobKey = `${userId}-${deckId}`;

      // Load existing log — Firestore-first, Blob fallback
      let log = [];
      const firestoreData = await getDoc(firestorePath);
      if (firestoreData?.events) {
        log = firestoreData.events;
      } else {
        try {
          const existing = await blobStore.get(blobKey, { type: "json" });
          if (existing?.events) log = existing.events;
        } catch {}
      }

      // Append new events
      log.push(...events);

      // Keep last 10,000 events per deck to prevent unbounded growth
      if (log.length > 10000) {
        log = log.slice(log.length - 10000);
      }

      const logData = {
        events: log,
        totalReviews: log.length,
        updatedAt: new Date().toISOString(),
      };

      // Dual-write: Firestore + Blob
      await Promise.all([
        setDoc(firestorePath, logData),
        blobStore.setJSON(blobKey, logData),
      ]);

      return Response.json({ success: true, totalReviews: log.length });
    } catch (err) {
      console.error("Review log save error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (req.method === "GET") {
    // Load review log for a deck
    try {
      const url = new URL(req.url);
      const deckId = url.searchParams.get("deckId");
      if (!deckId) return Response.json({ error: "deckId required" }, { status: 400 });

      // Firestore-first
      const firestoreData = await getDoc(`users/${userId}/reviewLogs/${deckId}`);
      if (firestoreData) {
        return Response.json(firestoreData);
      }

      // Fall back to Blob
      const store = getStore("review-logs");
      const log = await store.get(`${userId}-${deckId}`, { type: "json" });

      if (log) {
        // Lazy-migrate to Firestore
        try {
          await setDoc(`users/${userId}/reviewLogs/${deckId}`, log);
        } catch (e) {
          console.error("Lazy-migrate review log to Firestore failed:", e);
        }
        return Response.json(log);
      }

      return Response.json({ events: [], totalReviews: 0 });
    } catch (err) {
      return Response.json({ events: [], totalReviews: 0 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
