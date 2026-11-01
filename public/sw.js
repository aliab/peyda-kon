// Network-first with an offline fallback: online launches always get the latest
// version, offline launches use the copy saved at install time.
const CACHE = 'peyda-kon-v4';
const NETWORK_TIMEOUT_MS = 3000;
const ASSETS = [
  './', './css/style.css', './manifest.webmanifest',
  './js/main.js', './js/audio.js', './js/fx.js', './js/data.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

// Hosts may redirect (e.g. /index.html -> /). Browsers refuse redirected responses
// for page loads, so store a clean copy instead.
const clean = async (res) =>
  res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((url) => fetch(url, { cache: 'reload' }).then(clean).then((res) => c.put(url, res)))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? './' : req;
    // A navigate request can't be cloned with options, so rebuild it from its URL.
    const netReq = req.mode === 'navigate' ? new Request(req.url, { cache: 'no-cache' }) : new Request(req, { cache: 'no-cache' });
    try {
      const res = await Promise.race([
        fetch(netReq),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
      ]);
      const out = await clean(res);
      if (out.ok) await cache.put(key, out.clone());
      return out;
    } catch {
      return (await cache.match(key, { ignoreSearch: true })) || Response.error();
    }
  })());
});
