import { getStore } from "@netlify/blobs";

function getUserId(req) {
  const id = req.headers.get("x-user-id");
  if (!id) throw new Error("Unauthorized");
  return id;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { cards, progress } = await req.json();
    const userId = getUserId(req);
    const store = getStore("flashcards");

    if (cards && Array.isArray(cards)) {
      await store.setJSON(`${userId}-cards`, {
        cards,
        updatedAt: new Date().toISOString(),
        count: cards.length,
      });
    }

    if (progress) {
      await store.setJSON(`${userId}-progress`, {
        progress,
        updatedAt: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error saving:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to save" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/save-cards",
};
