/**
 * Unified push notification registration for both native (Capacitor) and web.
 *
 * Native: Uses @capacitor/push-notifications → FCM/APNs token
 * Web: Uses Web Push API → VAPID subscription
 *
 * Both paths save the token/subscription to the server via push-subscribe endpoint.
 */

const VAPID_PUBLIC = "BN6vNn-TlTMmUd4N50ssRBXLmQ17tZVeLJZEJJzooi7Ve-jBWk_Y4mYT_djdpUlDHMefgnp5QqfA1PxNEGnmXzE";

const isCapacitor = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();

function getAuthHeaders() {
  const h = { "Content-Type": "application/json" };
  try {
    const user = JSON.parse(localStorage.getItem("mcat-user"));
    if (user?.id) h["X-User-Id"] = user.id;
  } catch {}
  const token = localStorage.getItem("mcat-access-token");
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

// =============================================
// Native (Capacitor) push
// =============================================
async function registerNativePush(prefs) {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  // Request permission
  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== "granted") {
    return { success: false, reason: "denied" };
  }

  // Register with APNs/FCM
  await PushNotifications.register();

  // Wait for the registration token
  return new Promise((resolve) => {
    PushNotifications.addListener("registration", async (token) => {
      console.log("Native push token:", token.value);

      // Save to server
      try {
        await fetch("/.netlify/functions/push-subscribe", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            subscription: {
              type: "fcm",
              token: token.value,
            },
            prefs,
          }),
        });
        resolve({ success: true, token: token.value });
      } catch (err) {
        console.error("Failed to save native push token:", err);
        resolve({ success: false, reason: err.message });
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Native push registration failed:", err);
      resolve({ success: false, reason: err.error || "registration failed" });
    });
  });
}

async function unregisterNativePush() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
  } catch {}

  await fetch("/.netlify/functions/push-unsubscribe", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  });
}

function setupNativeListeners() {
  import("@capacitor/push-notifications").then(({ PushNotifications }) => {
    // Handle notification received while app is in foreground
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received in foreground:", notification);
    });

    // Handle notification tap (app was in background)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push notification tapped:", action);
      // Navigate to study page or wherever makes sense
    });
  }).catch(() => {});
}

// =============================================
// Web Push
// =============================================
async function registerWebPush(prefs) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, reason: "unsupported" };
  }

  // Request notification permission
  if (Notification.permission === "denied") {
    return { success: false, reason: "denied" };
  }

  if (Notification.permission !== "granted") {
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      return { success: false, reason: "denied" };
    }
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }

  // Save to server
  await fetch("/.netlify/functions/push-subscribe", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      subscription: { type: "web", ...sub.toJSON() },
      prefs,
    }),
  });

  return { success: true };
}

async function unregisterWebPush() {
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/.netlify/functions/push-unsubscribe", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ endpoint }),
      });
    }
  }
}

// =============================================
// Unified API
// =============================================

export async function registerPush(prefs) {
  if (isCapacitor) {
    return registerNativePush(prefs);
  }
  return registerWebPush(prefs);
}

export async function unregisterPush() {
  if (isCapacitor) {
    return unregisterNativePush();
  }
  return unregisterWebPush();
}

export async function sendTestPush() {
  const res = await fetch("/.netlify/functions/push-test", {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export function initPushListeners() {
  if (isCapacitor) {
    setupNativeListeners();
  }
}

export function getPushSupport() {
  if (isCapacitor) {
    return { supported: true, type: "native" };
  }
  if ("PushManager" in window && "serviceWorker" in navigator && "Notification" in window) {
    return { supported: true, type: "web" };
  }
  // iOS Safari without PWA
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  if (isIOS && !isStandalone) {
    return { supported: false, type: "ios-safari", reason: "Install as PWA for notifications" };
  }
  return { supported: false, type: "unsupported" };
}
