// daizu service worker — minimal offline shell.
// Network-first for pages (so deploys land immediately), cache-first for
// static assets and fonts. Never touches Supabase or /api calls.
const CACHE = 'daizu-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Data must always be live — never intercept Supabase or the API
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return;

  // App shell: network-first, cached copy when the train has no signal
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = (await caches.match(req)) || (await caches.match('/'));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Hashed static assets, fonts, icons: cache-first
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    FONT_HOSTS.includes(url.hostname) ||
    /\.(png|svg|ico)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      })()
    );
  }
});
