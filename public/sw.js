/*
 * Net Profit's service worker, so the game installs as an app and plays with no signal.
 * The page comes from the network whenever there is one, so a new version arrives on the next
 * open, and from the cache when there is none. Each time the page is fetched, the cache keeps
 * the scripts and styles that page uses and drops the ones an older page used: their names
 * carry a hash of what is in them, so a name never changes what it holds, and they come from
 * the cache first. Icons and the fonts come from the cache and are refreshed behind it.
 * Saves are not here: they stay in localStorage, which this never touches.
 */
const CACHE = 'netprofit';
// A server may say its answer varies by the asking page's origin (vite preview does): a script kept from a plain
// fetch must still answer the page's request for it as a module, so lookups ignore that.
const ANY = { ignoreVary: true };
const PAGE = new URL('./', self.registration.scope).href;
const isAsset = (url) => url.origin === self.location.origin && url.pathname.includes('/assets/');
const isFont = (url) =>
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

/** Keep a fresh copy of the page, and exactly the assets it uses. */
async function keepPage(cache, res) {
  const html = await res.clone().text();
  await cache.put(PAGE, res);
  const want = new Set(
    [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map((m) => new URL(m[1], PAGE).href),
  );
  for (const req of await cache.keys())
    if (isAsset(new URL(req.url)) && !want.has(req.url)) await cache.delete(req);
  await Promise.all(
    [...want].map(async (u) => {
      if (await cache.match(u, ANY)) return;
      const r = await fetch(u);
      if (r.ok) await cache.put(u, r);
    }),
  );
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    (async () => {
      const res = await fetch(PAGE, { cache: 'no-cache' });
      if (res.ok) await keepPage(await caches.open(CACHE), res);
    })().catch(() => {}),
  );
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname === new URL(PAGE).pathname) {
            const copy = res.clone();
            e.waitUntil(
              caches
                .open(CACHE)
                .then((c) => keepPage(c, copy))
                .catch(() => {}),
            );
          }
          return res;
        })
        .catch(async () => (await caches.match(PAGE, ANY)) ?? Response.error()),
    );
    return;
  }
  if (isAsset(url)) {
    e.respondWith(
      caches.match(req, ANY).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
            }
            return res;
          }),
      ),
    );
    return;
  }
  if (url.origin === self.location.origin || isFont(url)) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req, ANY);
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') c.put(req, res.clone());
            return res;
          })
          .catch(() => hit ?? Response.error());
        if (hit) {
          e.waitUntil(fresh.then(() => {}));
          return hit;
        }
        return fresh;
      }),
    );
  }
});
