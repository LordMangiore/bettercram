import { getStore } from "@netlify/blobs";

function getUserId(req) {
  return req.headers.get("x-user-id") || "default";
}

export default async (req) => {
  try {
    const userId = getUserId(req);
    const store = getStore("flashcards");

    const data = await store.get(`${userId}-study-plan`, { type: "json" });
    if (data?.plan) {
      return new Response(
        JSON.stringify({ plan: data.plan }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ plan: null }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error loading study plan:", error);
    return new Response(
      JSON.stringify({ plan: null }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/load-study-plan",
};
