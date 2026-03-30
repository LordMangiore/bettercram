import { useState, useCallback, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("mcat-user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() => {
    try {
      return localStorage.getItem("mcat-access-token") || null;
    } catch {
      return null;
    }
  });

  const [authReady, setAuthReady] = useState(true);
  const [otpStep, setOtpStep] = useState("email"); // "email" | "code" | "sending" | "verifying"
  const [otpEmail, setOtpEmail] = useState("");
  const [otpError, setOtpError] = useState("");

  // On mount, restore user from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mcat-user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
    // Firebase Auth restores its own session automatically via SDK persistence
    setAuthReady(true);
  }, []);

  // Send OTP code to email
  const sendOTP = useCallback(async (email) => {
    setOtpError("");
    setOtpStep("sending");
    setOtpEmail(email);

    try {
      const res = await fetch("/.netlify/functions/otp-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Failed to send code");
        // Rate limited = code already sent, show the code input
        setOtpStep(res.status === 429 ? "code" : "email");
        return { success: false, error: data.error };
      }

      setOtpStep("code");
      return { success: true };
    } catch (err) {
      setOtpError("Network error. Try again.");
      setOtpStep("email");
      return { success: false, error: err.message };
    }
  }, []);

  // Verify OTP code, then sign into Firebase Auth
  const verifyOTP = useCallback(async (code) => {
    setOtpError("");
    setOtpStep("verifying");

    try {
      const res = await fetch("/.netlify/functions/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Verification failed");
        setOtpStep("code");
        return { success: false, error: data.error };
      }

      // Sign into Firebase Auth using the idToken from server
      let firebaseToken = null;
      if (data.firebase?.idToken) {
        try {
          const { auth: firebaseAuth } = await import("../lib/firebase");
          const { signInWithCustomToken } = await import("firebase/auth");
          // The server already signed us in via REST API and returned an idToken
          // We use it as the access token; Firebase SDK will handle refresh
          firebaseToken = data.firebase.idToken;
        } catch (err) {
          console.error("Firebase Auth setup failed (non-fatal):", err);
        }
      }

      // Set user with existing ID (preserves data continuity)
      const userData = data.user;
      const token = firebaseToken || data.token;
      setUser(userData);
      setAccessToken(token);
      localStorage.setItem("mcat-user", JSON.stringify(userData));
      localStorage.setItem("mcat-access-token", token);
      setOtpStep("email");
      setOtpEmail("");

      // Track signup vs login
      if (window.plausible) {
        if (data.isNewUser) {
          window.plausible("Signup", { props: { method: "otp" } });
        } else {
          window.plausible("Login", { props: { method: "otp" } });
        }
      }

      return { success: true, isNewUser: data.isNewUser };
    } catch (err) {
      setOtpError("Network error. Try again.");
      setOtpStep("code");
      return { success: false, error: err.message };
    }
  }, [otpEmail]);

  const logout = useCallback(async () => {
    try {
      const { auth: firebaseAuth } = await import("../lib/firebase");
      const { signOut } = await import("firebase/auth");
      await signOut(firebaseAuth);
    } catch {}
    setUser(null);
    setAccessToken(null);
    setOtpStep("email");
    setOtpEmail("");
    setOtpError("");
    localStorage.removeItem("mcat-user");
    localStorage.removeItem("mcat-access-token");
    localStorage.removeItem("mcat-firebase-creds"); // legacy cleanup
  }, []);

  return {
    user,
    accessToken,
    authReady,
    // OTP
    otpStep,
    otpEmail,
    otpError,
    sendOTP,
    verifyOTP,
    setOtpStep,
    // Legacy aliases (keep for App.jsx compat)
    login: sendOTP,
    loginWithGoogle: null,
    loginWithEmail: sendOTP,
    emailSent: otpStep === "code",
    handleCallback: useCallback(async () => false, []),
    isNative: false,
    logout,
  };
}
