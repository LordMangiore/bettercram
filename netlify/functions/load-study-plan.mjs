import { getStore } from "@netlify/blobs";
import { getDoc, setDoc } from "./lib/firestore.mjs";

function getUserId(req) {
  const id = req.headers.get("x-user-id");
  if (!id) throw new Error("Unauthorized");
  return id;
}

export default async (req) => {
  try {
    const userId = getUserId(req);

    // Firestore-first
    const firestoreData = await getDoc(`users/${userId}/studyPlan`);
    if (firestoreData?.plan) {
      return new Response(
        JSON.stringify({ plan: firestoreData.plan }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fall back to Blob
    const store = getStore("flashcards");
    const data = await store.get(`${userId}-study-plan`, { type: "json" });

    if (data?.plan) {
      // Lazy-migrate to Firestore
      try {
        await setDoc(`users/${userId}/studyPlan`, data);
      } catch (e) {
        console.error("Lazy-migrate study plan to Firestore failed:", e);
      }

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
