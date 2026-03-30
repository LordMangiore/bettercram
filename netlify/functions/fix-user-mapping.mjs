import { getStore } from "@netlify/blobs";

/**
 * One-time fix: update a user's email-to-userId mapping.
 * Used when a user's data is under an old ID (e.g. Google auth)
 * but they're now logging in via OTP which creates a new ID.
 */
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, correctUserId } = await req.json();
    if (!email || !correctUserId) {
      return Response.json({ error: "email and correctUserId required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const store = getStore("email-to-user");

    // Update the mapping
    await store.setJSON(normalizedEmail, {
      userId: correctUserId,
      updatedAt: Date.now(),
      reason: "manual-fix",
    });

    return Response.json({ success: true, email: normalizedEmail, userId: correctUserId });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
