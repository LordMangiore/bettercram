const CACHE_NAME = 'bettercram-1774486856397';
const SHELL_URLS = ['/', '/index.html'];

// Notification preferences (updated via postMessage from the app)
let notificationPrefs = null;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first for API calls
  if (event.request.url.includes('/.netlify/functions/') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('api.firecrawl.dev') ||
      event.request.url.includes('api.anthropic.com') ||
      event.request.url.includes('api.elevenlabs.io')) {
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// --- Push Notification Support ---

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_NOTIFICATION_PREFS') {
    notificationPrefs = event.data.prefs;
  }
  if (event.data && event.data.type === 'SHOW_REMINDER') {
    self.registration.showNotification(event.data.title || 'BetterCram', {
      body: event.data.body || 'Time to study!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'study-reminder',
      actions: [
        { action: 'study', title: 'Study Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    });
  }
});

// Periodic sync (Chrome 80+, limited support)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'study-reminder') {
    event.waitUntil(showStudyReminder(notificationPrefs));
  }
});

async function showStudyReminder(prefs) {
  const messages = [];
  if (!prefs || !prefs.enabled) return;

  if (prefs.cardsDue) {
    messages.push('You have cards due today! Keep your streak going.');
  }
  if (prefs.streakReminder) {
    messages.push("Don't forget to study today — keep that streak alive!");
  }
  if (prefs.examCountdown) {
    messages.push('Your exam is approaching. Time to review!');
  }

  const body = messages.length > 0
    ? messages[Math.floor(Math.random() * messages.length)]
    : 'Time to study! Open BetterCram to review your cards.';

  return self.registration.showNotification('BetterCram', {
    body: body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'study-reminder',
    renotify: true,
    actions: [
      { action: 'study', title: 'Study Now' },
      { action: 'dismiss', title: 'Later' },
    ],
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // 'study' action or just clicking the notification
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow('/');
    })
  );
});
