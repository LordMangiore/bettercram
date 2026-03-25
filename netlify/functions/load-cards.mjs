import { getStore } from "@netlify/blobs";

function getUserId(req) {
  return req.headers.get("x-user-id") || "default";
}

export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const userId = getUserId(req);
    const store = getStore("flashcards");

    const cardsData = await store.get(`${userId}-cards`, { type: "json" });
    const progressData = await store.get(`${userId}-progress`, { type: "json" });

    // Fallback chain: user cards → default cards → legacy "mcat-cards" key
    let cards = cardsData;
    if (!cards && userId !== "default") {
      cards = await store.get("default-cards", { type: "json" });
    }
    if (!cards) {
      cards = await store.get("mcat-cards", { type: "json" });
    }

    return new Response(
      JSON.stringify({
        cards: cards?.cards || [],
        updatedAt: cards?.updatedAt || null,
        progress: progressData?.progress || {},
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error loading:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to load" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/load-cards",
};
