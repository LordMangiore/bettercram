import { deleteDoc, listDocs } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { endpoint } = await req.json();

    if (endpoint) {
      // Delete specific subscription by endpoint hash
      const endpointHash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint))
        )
      ).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);

      await deleteDoc(`users/${userId}/pushSubscriptions/${endpointHash}`);
    } else {
      // Delete all subscriptions for this user
      const subs = await listDocs(`users/${userId}/pushSubscriptions`);
      await Promise.all(subs.map(s => deleteDoc(`users/${userId}/pushSubscriptions/${s.id}`)));
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
