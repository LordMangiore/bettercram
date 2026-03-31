import { getStore } from "@netlify/blobs";
import { getDoc, setDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Missing user ID" }, { status: 401 });
  }

  try {
    const raw = await req.json();

    // Whitelist allowed fields — reject anything else
    // Username must go through claim-username endpoint for uniqueness enforcement
    const ALLOWED_FIELDS = [
      "name", "email", "subjects", "familiarity",
      "studyStyle", "studyContext", "onboardingComplete", "examDate",
      "picture", "theme", "notificationPrefs",
    ];
    const profile = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in raw) profile[key] = raw[key];
    }

    // Validate field types
    if (profile.name && typeof profile.name !== "string") delete profile.name;
    if (profile.name) profile.name = profile.name.slice(0, 100);
    if (profile.subjects && !Array.isArray(profile.subjects)) delete profile.subjects;
    if (profile.subjects) profile.subjects = profile.subjects.slice(0, 20).map(s => String(s).slice(0, 50));

    // Merge with existing profile — try Firestore first, fall back to Blob
    let existing = {};
    try {
      existing = await getDoc(`users/${userId}`) || {};
    } catch {}
    if (!existing || Object.keys(existing).length === 0) {
      try {
        const store = getStore("user-profiles");
        existing = await store.get(userId, { type: "json" }) || {};
      } catch {}
    }

    const merged = {
      ...existing,
      ...profile,
      lastLoginAt: new Date().toISOString(),
    };

    // Ensure createdAt is preserved
    if (!merged.createdAt) {
      merged.createdAt = new Date().toISOString();
    }

    // Dual-write: Firestore + Blob
    const store = getStore("user-profiles");
    await Promise.all([
      setDoc(`users/${userId}`, merged),
      store.setJSON(userId, merged),
    ]);

    return Response.json({ success: true, profile: merged });
  } catch (err) {
    console.error("Save profile error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
