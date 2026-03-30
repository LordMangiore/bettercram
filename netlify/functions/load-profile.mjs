import { getStore } from "@netlify/blobs";
import { getDoc, setDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Missing user ID" }, { status: 401 });
  }

  try {
    // Firestore-first
    let profile = await getDoc(`users/${userId}`);

    if (profile) {
      return Response.json({ profile });
    }

    // Fall back to Blob
    const store = getStore("user-profiles");
    profile = await store.get(userId, { type: "json" });

    if (!profile) {
      return Response.json({ profile: null });
    }

    // Lazy-migrate: write to Firestore for next time
    try {
      await setDoc(`users/${userId}`, profile);
    } catch (e) {
      console.error("Lazy-migrate profile to Firestore failed:", e);
    }

    return Response.json({ profile });
  } catch (err) {
    console.error("Load profile error:", err);
    return Response.json({ profile: null });
  }
}
