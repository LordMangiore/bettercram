import { setDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subscription, prefs } = await req.json();

    if (!subscription) {
      return Response.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    // Generate a stable ID for this subscription (so re-registering updates rather than duplicates)
    let subId;
    const hashSource = subscription.type === "fcm"
      ? subscription.token
      : subscription.endpoint;

    if (!hashSource) {
      return Response.json({ error: "Missing token or endpoint" }, { status: 400 });
    }

    subId = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashSource))
      )
    ).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);

    await setDoc(`users/${userId}/pushSubscriptions/${subId}`, {
      type: subscription.type || "web", // "fcm" for native, "web" for browser
      subscription: JSON.stringify(subscription),
      prefs: prefs || { cardsDue: true, streakReminder: true, examCountdown: false },
      reminderTime: prefs?.reminderTime || "09:00",
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ success: true, id: subId });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
