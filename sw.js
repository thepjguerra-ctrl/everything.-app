/* ── EVERYTHING. service worker ────────────────────────────────────────────────
 *
 * Makes the app open and work with no network after the first visit.
 *
 * WHAT ACTUALLY HAS TO BE CACHED
 * This is a single-file app: every line of app logic lives inline in
 * index.html, and all user data lives in localStorage. The app makes zero
 * network requests once it has booted. So "works offline" reduces to exactly
 * one job — get these to the browser without a network:
 *   1. index.html            the app itself (markup + all logic + all styles)
 *   2. React + ReactDOM      loaded from a CDN by the boot script
 *   3. Tabler icons          webfont CSS + the .woff2 it points at
 *   4. Anton / Barlow        Google Fonts CSS + the .woff2 files it points at
 *   5. manifest + icons      so an installed copy still has its identity
 * Nothing else exists to cache. There is no API, no data fetch, no upload.
 *
 * THE TWO STRATEGIES, AND WHY THEY DIFFER
 *
 * index.html → NETWORK-FIRST (cache is the fallback, never the default).
 *   This is a data-safety requirement, not a speed preference. migrateAppState()
 *   in index.html rebuilds saved state as an explicit whitelist object literal:
 *   any field it doesn't know about is dropped, and the next save writes the
 *   stripped result back to localStorage. So a stale cached index.html from
 *   before a module existed (Lists and Time Clock are recent) would silently
 *   delete that module's data for a user who has it. Serving cached app code to
 *   someone who has a working network is therefore a way to lose user data.
 *   Network-first means cached code is only ever used when the network genuinely
 *   fails — and a deploy is picked up on the very next online load, with no
 *   version constant in this file to remember to bump.
 *
 * vendor CDN files → CACHE-FIRST.
 *   Version-pinned, immutable, and large. Once fetched they never need to be
 *   refetched. Bump SW_VERSION below to force them to be re-fetched.
 *
 * other same-origin files → STALE-WHILE-REVALIDATE.
 *   Served instantly from cache, refreshed in the background. Keeps this app
 *   pleasant to fork and edit locally: change an asset, reload twice, see it.
 *
 * HOW UPDATES GET PICKED UP (the "stale code forever" failure mode)
 *   - App code: network-first, so a push is live on the next online load.
 *     Nothing here has to be bumped for that to happen.
 *   - This file: registered with updateViaCache:'none', so the browser always
 *     revalidates it against the server rather than its own HTTP cache. Any
 *     byte change installs a new worker, which skipWaiting()s and claims
 *     clients immediately.
 *   - Vendor files: only when SW_VERSION changes. Bump it whenever the CDN
 *     URLs in index.html change, so the precache list and the page agree.
 */

// Bump when the vendor URLs below change, or to force a clean re-precache.
const SW_VERSION = 'v1';

const SHELL_CACHE = 'everything-shell-' + SW_VERSION;
const VENDOR_CACHE = 'everything-vendor-' + SW_VERSION;
const CURRENT_CACHES = [SHELL_CACHE, VENDOR_CACHE];

// Every cache this worker is allowed to touch starts with this. github.io is a
// SHARED origin across all of a user's Pages sites, and the Cache Storage API is
// origin-wide (unlike the worker's scope), so cleanup must never delete a cache
// it doesn't recognise as ours.
const CACHE_PREFIX = 'everything-';

// Canonical cache key for the app document. Any navigation — "/", "/index.html",
// or a deep link inside the scope — falls back to this one entry.
const SHELL_DOC = new URL('./index.html', self.location.href).href;

// Same-origin shell. index.html is required; the rest are best-effort, since
// each already degrades gracefully — the home-screen icons only matter to an
// installed copy, and the two brand images have onError fallbacks in the app
// (the wordmark drops to styled text, the emblem just hides). Best-effort also
// keeps the 900KB emblem from ever being able to block offline support.
const SHELL_REQUIRED = [SHELL_DOC];
const SHELL_OPTIONAL = [
  './manifest.json',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  // Rendered by the desktop sidebar — brand wordmark and footer emblem.
  './assets/everything_logo.png',
  './assets/everything_emblem.png',
].map((u) => new URL(u, self.location.href).href);

// The app cannot boot without these, so a failure here fails the install and the
// browser retries on the next visit. Only the FIRST of index.html's three CDN
// fallback sets is precached: offline, jsdelivr is served from this cache and
// boot succeeds on the first try, so caching unpkg and cdnjs too would just be
// two more copies of React that are never read.
const VENDOR_REQUIRED = [
  'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
];

// Stylesheets whose @font-face rules are parsed so the .woff2 files they point
// at get cached too. Fetching these from inside the worker (rather than hard-
// coding the font URLs) is what makes this robust: Google Fonts returns
// different font URLs per browser, and the Tabler URL is @latest, so its font
// filename carries a version query that changes when Tabler ships a release.
// Reading the real CSS means the precached font URLs always match the ones the
// page will actually ask for. Best-effort — missing icons is a cosmetic
// degradation, not a reason to have no offline support at all.
const VENDOR_STYLESHEETS = [
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@700;900&display=swap',
];

const VENDOR_HOSTS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// How long to wait for the network on a navigation before falling back to the
// cached app. When actually offline, fetch() rejects in milliseconds and this
// never comes into play; it only covers a connection that hangs instead of
// failing. Deliberately generous — falling back means running possibly-older app
// code, so a slow-but-real network should still be allowed to win.
const NAV_TIMEOUT_MS = 8000;

// ── install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

async function precache() {
  const shell = await caches.open(SHELL_CACHE);
  const vendor = await caches.open(VENDOR_CACHE);

  // Required: reject the install if these fail, so the browser retries later
  // rather than activating a worker that can't actually serve the app offline.
  await Promise.all([
    ...SHELL_REQUIRED.map((url) => cacheFresh(shell, url, 'same-origin')),
    ...VENDOR_REQUIRED.map((url) => cacheFresh(vendor, url, 'cors')),
  ]);

  // Best-effort: never let a cosmetic asset block offline support.
  await Promise.all([
    ...SHELL_OPTIONAL.map((url) => ignore(cacheFresh(shell, url, 'same-origin'))),
    ...VENDOR_STYLESHEETS.map((url) => ignore(cacheStylesheetWithFonts(vendor, url))),
  ]);
}

// Fetch bypassing the HTTP cache, so we never precache a copy the browser
// already had lying around stale, then store it.
async function cacheFresh(cache, url, mode) {
  const res = await fetch(new Request(url, { mode: mode, cache: 'reload', credentials: 'omit' }));
  if (!res || !res.ok) throw new Error('precache failed (' + (res && res.status) + '): ' + url);
  await cache.put(url, res.clone());
  return res;
}

// Cache a stylesheet, then read it and cache the .woff2 files it references.
async function cacheStylesheetWithFonts(cache, url) {
  const res = await cacheFresh(cache, url, 'cors');
  const css = await res.text();
  const fonts = new Set();
  const urlRule = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  let match;
  while ((match = urlRule.exec(css)) !== null) {
    let absolute;
    try {
      absolute = new URL(match[1], url).href;
    } catch (e) {
      continue;
    }
    // woff2 only. Tabler's CSS also lists .eot/.woff/.ttf for browsers that
    // predate service workers by a decade; caching those would be ~500KB of
    // bytes no browser running this code will ever request.
    if (/\.woff2(\?|$)/i.test(absolute)) fonts.add(absolute);
  }
  await Promise.all([...fonts].map((f) => ignore(cacheFresh(cache, f, 'cors'))));
}

function ignore(promise) {
  return promise.catch((err) => {
    console.warn('[everything sw] optional precache skipped:', err && err.message);
  });
}

// ── activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith(CACHE_PREFIX) && CURRENT_CACHES.indexOf(n) === -1)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// ── fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  // Ignore extension/blob/data schemes — only real network traffic is cacheable.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstDocument(event));
    return;
  }

  if (VENDOR_HOSTS.indexOf(url.hostname) !== -1) {
    event.respondWith(cacheFirst(req, VENDOR_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
  }
  // Anything else: fall through to the browser's own handling untouched.
});

// The app document. Network wins whenever the network works; the cached copy
// exists only so a genuinely offline launch opens instead of failing.
async function networkFirstDocument(event) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await withTimeout(fetch(event.request), NAV_TIMEOUT_MS);
    if (res && res.ok && !res.redirected) {
      // Store under the canonical key so "/" and "/index.html" share one entry.
      // Redirected responses are skipped: they can't legally be replayed to a
      // navigation later, and caching one would poison the offline fallback.
      event.waitUntil(cache.put(SHELL_DOC, res.clone()));
    }
    return res;
  } catch (err) {
    const cached = await cache.match(SHELL_DOC);
    if (cached) return cached;
    // No network and nothing cached — first visit was never completed.
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>EVERYTHING.</title>' +
        '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;' +
        'max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#111;">' +
        '<h1 style="font-size:1.5rem;">You\'re offline.</h1>' +
        '<p style="color:#555;line-height:1.5;">EVERYTHING. needs to be opened once ' +
        'with a connection before it can work offline. Reconnect and reload.</p></div>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// Version-pinned vendor files: if we have it, it's correct.
async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const cache = await caches.open(cacheName);
  const res = await fetch(req);
  if (isCacheable(res)) cache.put(req, res.clone());
  return res;
}

// Same-origin assets: instant from cache, refreshed behind the user's back.
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (isCacheable(res)) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) return cached;
  const res = await network;
  if (res) return res;
  throw new Error('offline and uncached: ' + req.url);
}

function isCacheable(res) {
  if (!res) return false;
  // 206 throws on cache.put. Opaque responses (status 0) are stored deliberately:
  // they're how no-cors cross-origin stylesheets and fonts survive offline, and
  // the browser can still apply them even though we can't read them.
  if (res.status === 206) return false;
  return res.ok || res.type === 'opaque';
}

// Race a fetch against a timer. The fetch isn't aborted, just no longer waited
// on — if it lands later the browser still has it warm for the next load.
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
