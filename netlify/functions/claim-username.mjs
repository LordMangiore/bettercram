import { getStore } from "@netlify/blobs";
import { getDoc, setDoc, deleteDoc } from "./lib/firestore.mjs";

const RESERVED = ["admin", "bettercram", "nova", "sage", "system", "support", "help", "mod", "moderator", "staff", "official", "null", "undefined", "test"];

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return Response.json({ error: "Username is required" }, { status: 400 });
    }

    // Sanitize: alphanumeric + underscore only
    const cleaned = username.replace(/[^a-zA-Z0-9_]/g, "");
    if (cleaned !== username) {
      return Response.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
    }

    if (cleaned.length < 3) {
      return Response.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }

    if (cleaned.length > 20) {
      return Response.json({ error: "Username must be 20 characters or less" }, { status: 400 });
    }

    const lower = cleaned.toLowerCase();

    if (RESERVED.includes(lower)) {
      return Response.json({ error: "That username is reserved" }, { status: 400 });
    }

    // Check if this username is already taken
    const existing = await getDoc(`usernames/${lower}`);
    if (existing && existing.userId !== userId) {
      return Response.json({ error: "Username is already taken", available: false }, { status: 409 });
    }

    // If user already had a different username, release the old one
    let profile = {};
    try {
      profile = await getDoc(`users/${userId}`) || {};
    } catch {}

    const oldUsername = profile.username;
    if (oldUsername && oldUsername.toLowerCase() !== lower) {
      try {
        await deleteDoc(`usernames/${oldUsername.toLowerCase()}`);
      } catch {}
    }

    // Claim the new username
    await setDoc(`usernames/${lower}`, {
      userId,
      createdAt: new Date().toISOString(),
    });

    // Update user profile with the display-case username
    const merged = {
      ...profile,
      username: cleaned,
      lastLoginAt: new Date().toISOString(),
    };

    // Dual-write profile
    const store = getStore("user-profiles");
    await Promise.all([
      setDoc(`users/${userId}`, merged),
      store.setJSON(userId, merged),
    ]);

    return Response.json({ success: true, username: cleaned });
  } catch (err) {
    console.error("Claim username error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
