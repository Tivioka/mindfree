const CACHE = 'mindfree-v12';
const FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Network first
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Recevoir les rappels programmés depuis la page
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SCHEDULE_NOTIF') {
    const { title, time, key } = e.data;
    const delay = time - Date.now();
    if(delay > 0 && delay < 86400000 * 7) { // max 7 jours
      setTimeout(() => {
        self.registration.showNotification('🔔 MindFree', {
          body: title,
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [200, 100, 200],
          tag: key,
          renotify: true
        });
      }, Math.min(delay, 2147483647));
    }
  }
});

// Vérification périodique via Background Sync (si supporté)
self.addEventListener('periodicsync', e => {
  if(e.tag === 'check-notifs') {
    e.waitUntil(checkAndFireNotifs());
  }
});

async function checkAndFireNotifs() {
  // Lire depuis tous les clients ouverts
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage({ type: 'CHECK_NOTIFS' }));
}
