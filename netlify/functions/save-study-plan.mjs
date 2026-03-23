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
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { plan } = await req.json();
    const userId = getUserId(req);
    const store = getStore("flashcards");

    await store.setJSON(`${userId}-study-plan`, {
      plan,
      updatedAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error saving study plan:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to save study plan" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/save-study-plan",
};
