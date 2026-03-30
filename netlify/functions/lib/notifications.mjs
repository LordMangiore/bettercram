import { setDoc } from "./firestore.mjs";

/**
 * Create a notification for a user.
 * Called from other server functions when events happen.
 */
export async function createNotification(userId, { type, title, body, data = {} }) {
  const notifId = "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

  await setDoc(`users/${userId}/notifications/${notifId}`, {
    type,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
    data,
  });

  return notifId;
}
