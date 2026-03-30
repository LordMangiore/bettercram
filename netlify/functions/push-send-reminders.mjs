import webpush from "web-push";
import { listDocs, deleteDoc } from "./lib/firestore.mjs";

const VAPID_PUBLIC = "BN6vNn-TlTMmUd4N50ssRBXLmQ17tZVeLJZEJJzooi7Ve-jBWk_Y4mYT_djdpUlDHMefgnp5QqfA1PxNEGnmXzE";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY; // For native push via FCM legacy API

webpush.setVapidDetails("mailto:noreply@bettercram.com", VAPID_PUBLIC, VAPID_PRIVATE);

// ============================================================
// LOOT TABLE
// ============================================================
const MESSAGES = {
  cardsDue: {
    common: [
      { title: "Cards are due.", body: "Nova's ready when you are." },
      { title: "Quick session?", body: "10 minutes. That's all." },
      { title: "Hey, you've got cards waiting.", body: "They're not going anywhere. But also, go do them." },
      { title: "Study time.", body: "Your future self is counting on you." },
    ],
    uncommon: [
      { title: "Left on read.", body: "By your own flashcards. They're waiting." },
      { title: "Nova doesn't sleep.", body: "She just waits. Cards due. Nothing but time." },
      { title: "Not mad. Disappointed.", body: "Cards are due. Nova isn't angry. That's somehow worse." },
    ],
    rare: [
      { title: "Nova saw you.", body: "You opened the app. Then closed it. She remembers." },
      { title: "Your flashcards filed a missing persons report.", body: "You've been gone that long." },
    ],
    ultra: [
      { title: "Nova updated her LinkedIn.", body: "Status: waiting. Skills: patience. Looking for: you to open the app." },
      { title: "Your cards are in therapy.", body: "They're processing the abandonment. The therapist says you should call." },
    ],
    legendary: [
      { title: "You have been chosen.", body: "By an algorithm. To study. It's not that deep. But your exam is." },
    ],
  },
  streakReminder: {
    common: [
      { title: "Your streak is alive.", body: "Let's keep it that way." },
      { title: "Don't break the chain.", body: "You know the rules." },
    ],
    uncommon: [
      { title: "Don't let today be the day.", body: "You break the streak. You know the rules." },
      { title: "Nova has been ghosted before.", body: "It doesn't get easier." },
    ],
    rare: [
      { title: "Your streak called.", body: "It's on life support. Only you can save it." },
    ],
    ultra: [
      { title: "Your streak just became sentient.", body: "It has one wish. Don't let it die." },
    ],
    legendary: [
      { title: "NASA called.", body: "They want to study your streak. Said it's visible from space." },
    ],
  },
};

function rollRarity() {
  const weights = [60, 25, 10, 4, 1];
  const rarities = ["common", "uncommon", "rare", "ultra", "legendary"];
  const total = 100;
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return rarities[i];
  }
  return "common";
}

function getRandomMessage(prefs) {
  const types = [];
  if (prefs?.cardsDue !== false) types.push("cardsDue");
  if (prefs?.streakReminder) types.push("streakReminder");
  if (types.length === 0) types.push("cardsDue");
  const type = types[Math.floor(Math.random() * types.length)];
  const rarity = rollRarity();
  const pool = MESSAGES[type]?.[rarity] || MESSAGES.cardsDue.common;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// Send push to a single subscription
// ============================================================
async function sendToSubscription(sub) {
  let subscription;
  try {
    subscription = JSON.parse(sub.data.subscription);
  } catch {
    return { status: "parse_error" };
  }

  const msg = getRandomMessage(sub.data.prefs);
  const payload = JSON.stringify({ title: msg.title, body: msg.body, tag: "study-reminder" });

  if (subscription.type === "fcm" && subscription.token) {
    // Native push via FCM HTTP v1 or legacy API
    return sendFCM(subscription.token, msg);
  }

  // Web Push
  if (subscription.endpoint) {
    try {
      await webpush.sendNotification(subscription, payload);
      return { status: "sent" };
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        return { status: "expired" };
      }
      return { status: "error", code: err.statusCode };
    }
  }

  return { status: "unknown_type" };
}

async function sendFCM(token, msg) {
  if (!FCM_SERVER_KEY) {
    console.error("FCM_SERVER_KEY not configured");
    return { status: "no_fcm_key" };
  }

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: msg.title,
          body: msg.body,
          sound: "default",
          badge: "1",
        },
        data: {
          title: msg.title,
          body: msg.body,
          tag: "study-reminder",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("FCM error:", err);
      return { status: "error" };
    }

    const result = await res.json();
    if (result.failure > 0) {
      // Token is invalid/expired
      const err = result.results?.[0]?.error;
      if (err === "NotRegistered" || err === "InvalidRegistration") {
        return { status: "expired" };
      }
      return { status: "error" };
    }

    return { status: "sent" };
  } catch (err) {
    console.error("FCM send error:", err);
    return { status: "error" };
  }
}

// ============================================================
// Main handler
// ============================================================
export default async function handler(req) {
  // Only allow scheduled invocations or requests with a secret header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("x-cron-secret");
  const isScheduled = req.headers.get("x-nf-request-context"); // Netlify scheduler marker

  if (!isScheduled && cronSecret && authHeader !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VAPID_PRIVATE) {
    return Response.json({ error: "VAPID_PRIVATE_KEY not configured" }, { status: 500 });
  }

  try {
    const users = await listDocs("users");
    let sent = 0, failed = 0, cleaned = 0;

    for (const user of users) {
      const subs = await listDocs(`users/${user.id}/pushSubscriptions`);

      for (const sub of subs) {
        if (!sub.data.enabled) continue;

        const result = await sendToSubscription(sub);

        if (result.status === "sent") {
          sent++;
        } else if (result.status === "expired") {
          await deleteDoc(`users/${user.id}/pushSubscriptions/${sub.id}`);
          cleaned++;
        } else {
          failed++;
        }
      }
    }

    return Response.json({ sent, failed, cleaned, users: users.length });
  } catch (err) {
    console.error("Push send error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Netlify scheduled function — runs daily at 9am ET
export const config = {
  schedule: "0 13 * * *",
};
