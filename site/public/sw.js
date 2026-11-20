// Felt's service worker: makes the site installable as an app.
// Always fetches fresh pages (so new games show up right away) and only falls back
// to the last copy when there's no connection.
const CACHE = 'felt-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode !== 'navigate') return; // everything else goes straight to the network as usual
  e.respondWith(
    fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
  );
});
