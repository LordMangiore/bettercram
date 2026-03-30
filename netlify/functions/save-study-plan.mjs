import { getStore } from "@netlify/blobs";
import { setDoc } from "./lib/firestore.mjs";

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
    const { plan } = await req.json();
    const userId = getUserId(req);

    const planData = {
      plan,
      updatedAt: new Date().toISOString(),
    };

    // Dual-write: Firestore + Blob
    const store = getStore("flashcards");
    await Promise.all([
      setDoc(`users/${userId}/studyPlan`, planData),
      store.setJSON(`${userId}-study-plan`, planData),
    ]);

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
