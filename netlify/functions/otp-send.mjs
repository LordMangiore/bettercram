import { getStore } from "@netlify/blobs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email } = await req.json();
    if (!email || !email.includes("@") || email.length > 254) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit: max 3 OTP requests per email per 5 minutes
    const store = getStore("otp-codes");
    try {
      const existing = await store.get(normalizedEmail, { type: "json" });
      if (existing && existing.sentAt && (Date.now() - existing.sentAt) < 60_000) {
        return Response.json({ error: "Please wait 60 seconds before requesting a new code." }, { status: 429 });
      }
      if (existing && existing.sentCount >= 3 && (Date.now() - existing.firstSentAt) < 300_000) {
        return Response.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
      }
    } catch {}

    // Generate 6-digit code using crypto for better randomness
    const codeArray = new Uint32Array(1);
    crypto.getRandomValues(codeArray);
    const code = String(100000 + (codeArray[0] % 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in blobs — include rate limit tracking
    let sentCount = 1;
    let firstSentAt = Date.now();
    try {
      const existing = await store.get(normalizedEmail, { type: "json" });
      if (existing?.firstSentAt && (Date.now() - existing.firstSentAt) < 300_000) {
        sentCount = (existing.sentCount || 0) + 1;
        firstSentAt = existing.firstSentAt;
      }
    } catch {}

    await store.setJSON(normalizedEmail, {
      code,
      expiresAt,
      attempts: 0,
      sentAt: Date.now(),
      sentCount,
      firstSentAt,
    });

    // Send email
    const { error } = await resend.emails.send({
      from: "BetterCram <noreply@bettercram.com>",
      to: email,
      subject: `${code} — Your BetterCram login code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <span style="font-size: 24px; font-weight: bold; color: #6366f1;">⚡ BetterCram</span>
          </div>
          <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Your login code:</p>
          <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">bettercram.com — study smarter, not harder</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json({ error: "Failed to send code" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("OTP send error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
