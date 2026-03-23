import { useState, useCallback } from "react";

const GOOGLE_CLIENT_ID = "1046013443137-80ahu50q3nu7fmj36tqovub4siuj32qq.apps.googleusercontent.com";
const SCOPES = "openid email profile";

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

  const login = useCallback(() => {
    const redirectUri = window.location.origin;
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("prompt", "consent");
    window.location.href = authUrl.toString();
  }, []);

  const handleCallback = useCallback(async () => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return false;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get("access_token");
    if (!token) return false;

    // Get user info
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await res.json();

      const userData = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      };

      setUser(userData);
      setAccessToken(token);
      localStorage.setItem("mcat-user", JSON.stringify(userData));
      localStorage.setItem("mcat-access-token", token);

      // Clean URL
      window.history.replaceState(null, "", window.location.pathname);
      return true;
    } catch (e) {
      console.error("Failed to get user info:", e);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("mcat-user");
    localStorage.removeItem("mcat-access-token");
  }, []);

  return { user, accessToken, login, logout, handleCallback };
}
