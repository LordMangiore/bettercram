import { listDocs, setDoc, getDoc } from "./lib/firestore.mjs";

export default async function handler(req) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // GET: list notifications
  if (req.method === "GET") {
    try {
      const docs = await listDocs(`users/${userId}/notifications`);
      const notifications = docs
        .map(d => ({ id: d.id, ...d.data }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .slice(0, 50); // max 50
      return Response.json({ notifications });
    } catch (err) {
      console.error("List notifications error:", err);
      return Response.json({ notifications: [] });
    }
  }

  // POST: mark read / mark all read
  if (req.method === "POST") {
    try {
      const { action, notificationId } = await req.json();

      if (action === "markRead" && notificationId) {
        const existing = await getDoc(`users/${userId}/notifications/${notificationId}`);
        if (existing) {
          await setDoc(`users/${userId}/notifications/${notificationId}`, { ...existing, read: true });
        }
        return Response.json({ success: true });
      }

      if (action === "markAllRead") {
        const docs = await listDocs(`users/${userId}/notifications`);
        const unread = docs.filter(d => !d.data.read);
        await Promise.all(
          unread.map(d => setDoc(`users/${userId}/notifications/${d.id}`, { ...d.data, read: true }))
        );
        return Response.json({ success: true, marked: unread.length });
      }

      return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
      console.error("Notification action error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
