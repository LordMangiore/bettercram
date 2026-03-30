import { useState, useEffect } from "react";
import { registerPush, unregisterPush, sendTestPush, getPushSupport } from "../lib/pushNotifications";

const STORAGE_KEY = "bc-notification-prefs";

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

const DEFAULT_PREFS = {
  enabled: false,
  reminderTime: "09:00",
  cardsDue: true,
  streakReminder: true,
  examCountdown: false,
};

export default function NotificationSettings({ open, onClose }) {
  const [prefs, setPrefs] = useState(() => loadPrefs() || DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const pushSupport = getPushSupport();

  // Re-register with updated prefs when settings change
  useEffect(() => {
    savePrefs(prefs);
    if (prefs.enabled && pushSupport.supported) {
      registerPush(prefs).catch(console.error);
    }
  }, [prefs.reminderTime, prefs.cardsDue, prefs.streakReminder, prefs.examCountdown]);

  async function handleToggle() {
    if (prefs.enabled) {
      setLoading(true);
      try { await unregisterPush(); } catch (e) { console.error("Unsubscribe failed:", e); }
      setPrefs(p => ({ ...p, enabled: false }));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await registerPush({ ...prefs, enabled: true });
      if (result.success) {
        setPrefs(p => ({ ...p, enabled: true }));
      }
    } catch (e) {
      console.error("Push subscribe failed:", e);
    }
    setLoading(false);
  }

  async function handleTest() {
    setTestSending(true);
    setTestResult(null);
    try {
      const result = await sendTestPush();
      setTestResult(result.sent > 0 ? "sent" : "failed");
    } catch {
      setTestResult("failed");
    }
    setTestSending(false);
    setTimeout(() => setTestResult(null), 4000);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-bell text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Push notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* iOS Safari — needs PWA install */}
          {pushSupport.type === "ios-safari" && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm text-indigo-700 dark:text-indigo-300 space-y-3">
              <p className="font-medium">
                <i className="fa-solid fa-mobile-screen mr-2" />
                Install BetterCram for push notifications
              </p>
              <ol className="space-y-2 text-xs ml-1">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-500 shrink-0">1.</span>
                  Tap the <i className="fa-solid fa-arrow-up-from-bracket mx-1 text-indigo-500" /> share button
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-500 shrink-0">2.</span>
                  Tap <strong>"Add to Home Screen"</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-500 shrink-0">3.</span>
                  Open BetterCram from your home screen
                </li>
              </ol>
              <p className="text-xs opacity-75">iOS requires the app to be installed for push notifications.</p>
            </div>
          )}

          {/* Unsupported browser */}
          {pushSupport.type === "unsupported" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-sm text-yellow-700 dark:text-yellow-300">
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              Your browser doesn't support push notifications. Try Chrome, Firefox, or Edge.
            </div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Enable push notifications
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {pushSupport.type === "native"
                  ? "Get notified even when the app is closed"
                  : "Get reminded to study — even when the app is closed"}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={loading || !pushSupport.supported}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                prefs.enabled && pushSupport.supported ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
              } ${!pushSupport.supported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {loading ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <i className="fa-solid fa-spinner fa-spin text-xs text-white" />
                </span>
              ) : (
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  prefs.enabled && pushSupport.supported ? "translate-x-6" : "translate-x-1"
                }`} />
              )}
            </button>
          </div>

          {/* Settings (when enabled) */}
          {prefs.enabled && pushSupport.supported && (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  What to remind you about
                </p>
                {[
                  { key: "cardsDue", label: "Cards due", desc: "Remind when you have cards to review" },
                  { key: "streakReminder", label: "Streak reminder", desc: "Don't break your study streak" },
                  { key: "examCountdown", label: "Exam countdown", desc: "Reminders as your exam date approaches" },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs[key]}
                      onChange={(e) => setPrefs(p => ({ ...p, [key]: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Send test */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={handleTest}
                  disabled={testSending}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {testSending ? (
                    <><i className="fa-solid fa-spinner fa-spin mr-2" />Sending...</>
                  ) : testResult === "sent" ? (
                    <><i className="fa-solid fa-check mr-2" />Sent! Check your notifications</>
                  ) : testResult === "failed" ? (
                    <><i className="fa-solid fa-xmark mr-2" />Failed — try re-enabling</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane mr-2" />Send test notification</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
