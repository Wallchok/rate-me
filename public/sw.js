// Offline support: app screens and their files are cached, household data lives in localStorage.
// Photos from Vercel Blob and Open Food Facts are on other domains and only in the normal browser cache.
const CACHE = "rateme-v3";
const SHELL = ["/", "/category", "/product", "/add", "/try", "/settings"];
const SCANNER_WASM = "/zxing/zxing_reader.wasm";
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages are cached by path only (?id=... is read on the client)
function pageKey(url) {
  return new URL(url).pathname;
}

async function cachePage(key, response) {
  // Redirects mean "not logged in", never keep the login screen under an app path
  if (response.ok && !response.redirected && response.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(key, response.clone());
  }
  return response;
}

async function cacheIfMissing(cache, url) {
  if (await cache.match(url)) return;
  const res = await fetch(url);
  if (res.ok) await cache.put(url, res);
}

// Stores every screen together with the JS/CSS it needs. Next only prefetches files of links
// visible on screen, so without this a product page opened offline would stay blank.
async function warm() {
  const cache = await caches.open(CACHE);
  const assets = new Set([SCANNER_WASM]);
  await Promise.all(
    SHELL.map(async (path) => {
      const res = await fetch(path, { credentials: "same-origin" });
      if (!res.ok || res.redirected) return;
      const html = await res.clone().text();
      await cachePage(path, res);
      for (const match of html.matchAll(/\/_next\/static\/[^"'\s\\)]+/g)) assets.add(match[0]);
    })
  );
  await Promise.all([...assets].map((url) => cacheIfMissing(cache, url).catch(() => {})));
}

self.addEventListener("message", (event) => {
  if (event.data === "warm") event.waitUntil(warm().catch(() => {}));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Page navigation: network first, but with weak signal fall back to the cached copy after a few seconds
  if (request.mode === "navigate") {
    const key = pageKey(request.url);
    event.respondWith(
      (async () => {
        const network = fetch(request).then((res) => cachePage(key, res));
        const cached = await caches.match(key);
        if (!cached) return network.catch(async () => (await caches.match("/")) || Response.error());
        const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NAV_TIMEOUT_MS));
        return Promise.race([network.catch(() => cached), timeout]);
      })()
    );
    return;
  }

  // Next.js client navigation payloads: network only. On failure Next falls back to a full page load.
  if (request.headers.get("RSC") === "1") return;

  // Hashed build files, icons, scanner, locally uploaded photos: cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/zxing/") ||
    url.pathname.startsWith("/uploads/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});
