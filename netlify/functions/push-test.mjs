import webpush from "web-push";
import { listDocs } from "./lib/firestore.mjs";

const VAPID_PUBLIC = "BN6vNn-TlTMmUd4N50ssRBXLmQ17tZVeLJZEJJzooi7Ve-jBWk_Y4mYT_djdpUlDHMefgnp5QqfA1PxNEGnmXzE";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

webpush.setVapidDetails("mailto:noreply@bettercram.com", VAPID_PUBLIC, VAPID_PRIVATE);

const TEST_PAYLOAD = JSON.stringify({
  title: "Test notification!",
  body: "Push notifications are working perfectly.",
  tag: "test-push",
});

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VAPID_PRIVATE) {
    return Response.json({ error: "VAPID_PRIVATE_KEY not configured" }, { status: 500 });
  }

  try {
    const subs = await listDocs(`users/${userId}/pushSubscriptions`);

    if (subs.length === 0) {
      return Response.json({ error: "No push subscriptions found. Enable notifications first." }, { status: 404 });
    }

    let sent = 0;
    for (const sub of subs) {
      let subscription;
      try {
        subscription = JSON.parse(sub.data.subscription);
      } catch { continue; }

      try {
        if (subscription.type === "fcm" && subscription.token) {
          // Native FCM push
          if (!FCM_SERVER_KEY) { continue; }
          const res = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `key=${FCM_SERVER_KEY}`,
            },
            body: JSON.stringify({
              to: subscription.token,
              notification: { title: "Test notification!", body: "Push notifications are working perfectly.", sound: "default" },
            }),
          });
          if (res.ok) sent++;
        } else if (subscription.endpoint) {
          // Web Push
          await webpush.sendNotification(subscription, TEST_PAYLOAD);
          sent++;
        }
      } catch (err) {
        console.error("Test push failed:", err.statusCode || err.message);
      }
    }

    return Response.json({ success: true, sent, total: subs.length });
  } catch (err) {
    console.error("Push test error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
