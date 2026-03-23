import { getStore } from "@netlify/blobs";

function getUserId(req) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = JSON.parse(atob(auth.split(".")[1]));
      return payload.sub || "default";
    } catch {}
  }
  return "default";
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
