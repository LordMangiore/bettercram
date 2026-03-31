import { getStore } from "@netlify/blobs";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const IDENTITY_URL = "https://identitytoolkit.googleapis.com/v1";

/**
 * Create or sign in a Firebase Auth user via the Identity Toolkit REST API.
 * Returns { idToken, refreshToken, localId (Firebase UID) }.
 * No Admin SDK or service account needed — just the web API key.
 */
async function ensureFirebaseUser(email) {
  // Deterministic password from email + secret (only used as a shadow auth bridge)
  const secret = process.env.FIREBASE_PASS_SECRET;
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", keyData, encoder.encode(email));
  const password = "bc_" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

  // Try to sign in first
  let res = await fetch(`${IDENTITY_URL}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (res.ok) {
    const data = await res.json();
    return { idToken: data.idToken, refreshToken: data.refreshToken, uid: data.localId, password };
  }

  // Account doesn't exist — create it
  res = await fetch(`${IDENTITY_URL}/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Firebase Auth create failed:", err);
    // Non-fatal — fall back to OTP-only auth
    return null;
  }

  const data = await res.json();
  return { idToken: data.idToken, refreshToken: data.refreshToken, uid: data.localId, password };
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return Response.json({ error: "Email and code required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const store = getStore({ name: "otp-codes", consistency: "strong" });

    // Retry blob read up to 5 times with increasing delays
    let otpData = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        otpData = await store.get(normalizedEmail, { type: "json" });
        if (otpData) break;
      } catch (e) {
        console.log(`OTP blob read attempt ${attempt + 1} failed:`, e.message);
      }
      if (attempt < 4) await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }

    if (!otpData) {
      return Response.json({ error: "No code found. Request a new one." }, { status: 400 });
    }

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      await store.delete(normalizedEmail);
      return Response.json({ error: "Code expired. Request a new one." }, { status: 400 });
    }

    // Check attempts (max 5)
    if (otpData.attempts >= 5) {
      await store.delete(normalizedEmail);
      return Response.json({ error: "Too many attempts. Request a new code." }, { status: 400 });
    }

    // Verify code
    if (otpData.code !== code.trim()) {
      otpData.attempts += 1;
      await store.setJSON(normalizedEmail, otpData);
      return Response.json({ error: "Incorrect code. Try again." }, { status: 400 });
    }

    // Success — delete the OTP
    await store.delete(normalizedEmail);

    // Create/sign-in Firebase Auth account (gives us a real Firebase UID)
    const firebaseAuth = await ensureFirebaseUser(normalizedEmail);

    // Firebase UID is the canonical user ID (for Firestore security rules)
    const firebaseUid = firebaseAuth?.uid || null;

    // Legacy OTP-style user ID (for migration)
    const legacyUserId = "otp-" + normalizedEmail.replace(/[^a-z0-9]/g, "-");

    // Check if this email has an existing account mapping
    const userStore = getStore("email-to-user");
    let existingUserId;
    try {
      const mapping = await userStore.get(normalizedEmail, { type: "json" });
      if (mapping?.userId) {
        existingUserId = mapping.userId;
      }
    } catch {}

    // If no existing mapping, this is a brand new user
    let isNewUser = false;
    if (!existingUserId) {
      isNewUser = true;
      const userId = firebaseUid || legacyUserId;
      await userStore.setJSON(normalizedEmail, { userId, legacyUserId, firebaseUid, createdAt: Date.now() });
      existingUserId = userId;
    } else if (firebaseUid && existingUserId !== firebaseUid) {
      // Update mapping to include Firebase UID for future migration
      try {
        await userStore.setJSON(normalizedEmail, {
          userId: existingUserId,
          legacyUserId: existingUserId,
          firebaseUid,
          updatedAt: Date.now(),
        });
      } catch {}
    }

    // Generate a session token
    const sessionToken = firebaseAuth?.idToken || btoa(`${existingUserId}:${Date.now()}:${Math.random().toString(36).slice(2)}`);

    return Response.json({
      success: true,
      isNewUser,
      user: {
        id: existingUserId,
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0],
        firebaseUid,
      },
      token: sessionToken,
      // Firebase auth tokens only — never send passwords to client
      firebase: firebaseAuth ? {
        idToken: firebaseAuth.idToken,
        refreshToken: firebaseAuth.refreshToken,
        uid: firebaseAuth.uid,
      } : null,
    });
  } catch (err) {
    console.error("OTP verify error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
