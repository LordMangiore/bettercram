import { getDoc, listDocs } from "./lib/firestore.mjs";

/**
 * Look up a user by username or email.
 * GET ?q=someUsername or ?q=email@example.com
 * Returns { userId, username, name } or 404.
 */
export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return Response.json({ error: "Query too short" }, { status: 400 });
    }

    // Check if it's an email lookup
    if (query.includes("@")) {
      // Search users by email — scan user docs
      const users = await listDocs("users");
      const match = users.find(u => u.data?.email?.toLowerCase() === query.toLowerCase());
      if (match) {
        return Response.json({
          userId: match.id,
          username: match.data.username || null,
          name: match.data.name || match.data.email?.split("@")[0] || "User",
        });
      }
      return Response.json({ error: "No user found with that email" }, { status: 404 });
    }

    // Username lookup via index
    const lower = query.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const entry = await getDoc(`usernames/${lower}`);
    if (!entry?.userId) {
      return Response.json({ error: "Username not found", available: true }, { status: 404 });
    }

    // Load their profile for display info
    const profile = await getDoc(`users/${entry.userId}`);
    return Response.json({
      userId: entry.userId,
      username: profile?.username || lower,
      name: profile?.name || profile?.email?.split("@")[0] || "User",
    });
  } catch (err) {
    console.error("Lookup user error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
