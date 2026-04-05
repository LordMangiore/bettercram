const CACHE_NAME = 'bettercram-1775314686616';
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
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Never intercept API calls or external services
  if (event.request.url.includes('/.netlify/functions/') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('identitytoolkit.googleapis.com') ||
      event.request.url.includes('api.firecrawl.dev') ||
      event.request.url.includes('api.anthropic.com') ||
      event.request.url.includes('api.elevenlabs.io')) {
    return;
  }

  // Navigation requests (page loads) — network first, fall back to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
        }
        return response;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  // JS/CSS with content hashes (e.g. index-DFC6M3rk.js) — network first, MIME-validated cache
  const url = event.request.url;
  if (url.match(/\.(js|css)(\?|$)/)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const contentType = response.headers.get('content-type') || '';
        const isValidJS = url.includes('.js') && (contentType.includes('javascript') || contentType.includes('wasm'));
        const isValidCSS = url.includes('.css') && contentType.includes('css');
        // Only cache if the MIME type matches — never cache HTML fallbacks as JS
        if (response.ok && response.status === 200 && (isValidJS || isValidCSS)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — only return cached version if it has the right MIME type
        return caches.match(event.request).then((cached) => {
          if (cached) {
            const ct = cached.headers.get('content-type') || '';
            if (url.includes('.js') && !ct.includes('javascript')) return undefined; // don't serve HTML as JS
            if (url.includes('.css') && !ct.includes('css')) return undefined;
          }
          return cached;
        });
      })
    );
    return;
  }

  // Static assets (images, fonts, icons, audio) — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok && response.status === 200) {
          // Don't cache HTML responses for non-navigation requests (SPA fallback trap)
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) return response; // don't cache, just return
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => undefined);
    })
  );
});

// --- Push Notification Support ---

// Handle real push events from server
self.addEventListener('push', (event) => {
  let data = { title: 'BetterCram', body: 'Time to study!' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    try { data = { title: 'BetterCram', body: event.data.text() }; } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'BetterCram', {
      body: data.body || 'Time to study!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'study-reminder',
      renotify: true,
      data: data,
      actions: [
        { action: 'study', title: 'Study Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    })
  );
});

// Handle messages from the app (legacy local notifications)
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
