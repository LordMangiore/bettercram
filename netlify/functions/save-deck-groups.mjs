import { getStore } from "@netlify/blobs";
import { setDoc, getDoc } from "./lib/firestore.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { groups } = await req.json();

    if (!Array.isArray(groups)) {
      return Response.json({ error: "groups must be an array" }, { status: 400 });
    }

    // Validate and sanitize groups
    const sanitized = groups.slice(0, 50).map(g => ({
      id: String(g.id || "").slice(0, 50),
      name: String(g.name || "").slice(0, 100),
      color: String(g.color || "from-indigo-500 to-purple-600").slice(0, 100),
      order: typeof g.order === "number" ? g.order : 0,
    }));

    const data = { groups: sanitized, updatedAt: new Date().toISOString() };

    // Dual-write
    const store = getStore("deck-groups");
    await Promise.all([
      setDoc(`users/${userId}/deckGroups/config`, data),
      store.setJSON(userId, data),
    ]);

    return Response.json({ success: true, groups: sanitized });
  } catch (err) {
    console.error("Save deck groups error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/save-deck-groups",
};
