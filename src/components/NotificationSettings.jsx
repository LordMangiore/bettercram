import { useState, useEffect } from "react";

const STORAGE_KEY = "bc-notification-prefs";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

// Notification messages with personality
const NOTIFICATION_MESSAGES = {
  cardsDue: [
    { title: "Hey, you've got cards waiting.", body: "Nova's ready when you are." },
    { title: "13 cards due.", body: "Probably easier than you think." },
    { title: "Nova doesn't sleep.", body: "She just waits. You've got cards due and she has nothing but time." },
    { title: "Nova saw you.", body: "You opened the app. Then closed it. She remembers. The cards remember. Come back." },
    { title: "Not mad. Disappointed.", body: "Cards are due. Nova isn't angry. That's somehow worse. Open the app." },
    { title: "The cards remember you.", body: "You skipped them yesterday. They noticed. They're ready when you are. Are you ready?" },
    { title: "Nova has a file on you.", body: "It's mostly flashcards. Mostly. Cards are due. Let's keep it that way." },
    { title: "Left on read.", body: "By your own flashcards. They're waiting." },
  ],
  streakReminder: [
    { title: "Your streak is alive.", body: "Let's keep it that way." },
    { title: "Don't let today be the day.", body: "You break the streak. You know the rules." },
    { title: "You studied yesterday.", body: "Don't make it weird." },
    { title: "Nova has been ghosted before.", body: "It doesn't get easier." },
    { title: "You ghosted Nova.", body: "She's fine. The cards are not." },
  ],
  examCountdown: [
    { title: "Be so fr rn.", body: "You have an exam coming up and cards due. Nova is begging you. Open the app." },
    { title: "Your competition is up.", body: "Somewhere right now someone else is studying your material. Just saying. Nova said it." },
    { title: "The exam doesn't care if you're tired.", body: "Nova does though. Come study." },
    { title: "This is a cry for help.", body: "From your flashcards. They miss you. Nova misses you. Your exam date does not care." },
  ],
  inactivity: [
    { title: "Nova misses you.", body: "The flashcards do not have feelings but Nova does." },
    { title: "It's been a while.", body: "The cards aren't going to learn themselves." },
    { title: "Someone else is studying right now.", body: "Just saying." },
  ],
};

function getRandomMessage(type) {
  const messages = NOTIFICATION_MESSAGES[type] || NOTIFICATION_MESSAGES.cardsDue;
  return messages[Math.floor(Math.random() * messages.length)];
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function startTestMode() {
  stopTestMode();
  // Fire one immediately
  fireTestNotification();
  // Then every 5 minutes
  window._bcTestTimer = setInterval(fireTestNotification, 5 * 60 * 1000);
}

function stopTestMode() {
  if (window._bcTestTimer) {
    clearInterval(window._bcTestTimer);
    window._bcTestTimer = null;
  }
}

function fireTestNotification() {
  if (Notification.permission !== "granted") return;
  const allMessages = [
    ...NOTIFICATION_MESSAGES.cardsDue,
    ...NOTIFICATION_MESSAGES.streakReminder,
    ...NOTIFICATION_MESSAGES.examCountdown,
    ...NOTIFICATION_MESSAGES.inactivity,
  ];
  const msg = allMessages[Math.floor(Math.random() * allMessages.length)];
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_REMINDER",
      title: msg.title,
      body: msg.body,
    });
  } else {
    new Notification(msg.title, {
      body: msg.body,
      icon: "/icons/icon-192.png",
      tag: "study-reminder-test",
    });
  }
}

function scheduleLocalReminder(prefs) {
  // Clear any existing timer
  if (window._bcReminderTimer) {
    clearTimeout(window._bcReminderTimer);
    window._bcReminderTimer = null;
  }
  if (!prefs.enabled) return;

  const [hours, minutes] = prefs.reminderTime.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // If the time already passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  window._bcReminderTimer = setTimeout(() => {
    if (Notification.permission === "granted") {
      // Pick a message based on active reminder types
      let msgType = "cardsDue";
      if (prefs.streakReminder && Math.random() > 0.5) msgType = "streakReminder";
      if (prefs.examCountdown && Math.random() > 0.7) msgType = "examCountdown";
      const msg = getRandomMessage(msgType);

      // Try service worker notification first (works in background)
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_REMINDER",
          title: msg.title,
          body: msg.body,
        });
      } else {
        // Fallback to direct Notification API
        new Notification(msg.title, {
          body: msg.body,
          icon: "/icons/icon-192.png",
          tag: "study-reminder",
        });
      }
    }
    // Re-schedule for the next day
    scheduleLocalReminder(prefs);
  }, delay);
}

// Register periodic sync if supported
async function registerPeriodicSync() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if ("periodicSync" in reg) {
    try {
      await reg.periodicSync.register("study-reminder", {
        minInterval: 60 * 60 * 1000, // 1 hour
      });
    } catch {
      // periodicSync not available or permission denied — fallback handled
    }
  }
}

export default function NotificationSettings({ open, onClose }) {
  const [prefs, setPrefs] = useState(() => loadPrefs() || DEFAULT_PREFS);
  const [permissionState, setPermissionState] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [testMode, setTestMode] = useState(!!window._bcTestTimer);

  useEffect(() => {
    savePrefs(prefs);
    if (prefs.enabled && permissionState === "granted") {
      scheduleLocalReminder(prefs);
      registerPeriodicSync();
      // Pass prefs to service worker for background use
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "UPDATE_NOTIFICATION_PREFS",
          prefs,
        });
      }
    } else {
      // Clear timers if disabled
      if (window._bcReminderTimer) {
        clearTimeout(window._bcReminderTimer);
        window._bcReminderTimer = null;
      }
    }
  }, [prefs, permissionState]);

  async function handleToggle() {
    if (!prefs.enabled) {
      const granted = await requestNotificationPermission();
      setPermissionState(Notification.permission);
      if (granted) {
        setPrefs((p) => ({ ...p, enabled: true }));
      }
    } else {
      setPrefs((p) => ({ ...p, enabled: false }));
    }
  }

  if (!open) return null;

  const isUnsupported = permissionState === "unsupported";
  const isDenied = permissionState === "denied";

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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Study reminders
              </p>
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
          {isUnsupported && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-sm text-yellow-700 dark:text-yellow-300">
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              Your browser doesn't support notifications.
            </div>
          )}

          {isDenied && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
              <i className="fa-solid fa-ban mr-2" />
              Notifications are blocked. Please enable them in your browser settings.
            </div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Enable study reminders
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Get reminded to study daily
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={isUnsupported || isDenied}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                prefs.enabled
                  ? "bg-indigo-600"
                  : "bg-gray-300 dark:bg-gray-600"
              } ${isUnsupported || isDenied ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  prefs.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Settings (only when enabled) */}
          {prefs.enabled && permissionState === "granted" && (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              {/* Reminder time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Daily reminder time
                </label>
                <input
                  type="time"
                  value={prefs.reminderTime}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, reminderTime: e.target.value }))
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Reminder types */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reminder types
                </p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.cardsDue}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, cardsDue: e.target.checked }))
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Cards due</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Remind when you have cards to review
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.streakReminder}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        streakReminder: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      Streak reminder
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Don't break your study streak
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.examCountdown}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        examCountdown: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      Exam countdown
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Reminders as your exam date approaches
                    </p>
                  </div>
                </label>
              </div>

              {/* Test mode */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      <i className="fa-solid fa-flask mr-1.5 text-amber-500" />
                      Test mode
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Send a random notification every 5 min
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (testMode) {
                        stopTestMode();
                        setTestMode(false);
                      } else {
                        startTestMode();
                        setTestMode(true);
                      }
                    }}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      testMode ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
                    } cursor-pointer`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        testMode ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {testMode && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    <i className="fa-solid fa-circle-info mr-1" />
                    Active — first notification sent immediately, then every 5 min. Toggle off to stop.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
