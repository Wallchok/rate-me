// Offline support: app screens and their files are cached, household data lives in localStorage.
// Product photos from Open Food Facts are cached too; own photos in Vercel Blob only in the browser cache.
const CACHE = "rateme-v3";
const IMAGE_CACHE = "rateme-images-v1";
const IMAGE_HOST = "images.openfoodfacts.org";
const MAX_IMAGES = 400;
const SHELL = ["/", "/category", "/product", "/add", "/try", "/settings"];
const SCANNER_WASM = "/zxing/zxing_reader.wasm";
// Weak signal in a shop: give the network this long before falling back
const RSC_TIMEOUT_MS = 2500;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== IMAGE_CACHE).map((k) => caches.delete(k))))
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
async function warm(withScanner) {
  const cache = await caches.open(CACHE);
  // The page may fetch the scanner before this worker controls it (first visit), so fetch it here too
  const assets = new Set(withScanner ? [SCANNER_WASM] : []);
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
  const data = event.data || {};
  if (data.type === "warm") event.waitUntil(warm(data.scanner === true).catch(() => {}));
});

// Keeps the photo cache bounded; keys come back in insertion order, oldest first
async function trimImages() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_IMAGES)).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  // Open Food Facts photos: cache first. They are requested with CORS (crossorigin on <img>),
  // so the cache stores real responses instead of opaque ones that count as megabytes each.
  if (url.hostname === IMAGE_HOST) {
    if (request.mode !== "cors") return;
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) {
          await cache.put(request, res.clone());
          trimImages();
        }
        return res;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Screens are static, the data comes from localStorage: show the cached screen at once
  // and refresh it in the background, so weak signal never delays opening the app.
  if (request.mode === "navigate") {
    const key = pageKey(request.url);
    const network = fetch(request).then((res) => cachePage(key, res));
    event.respondWith(
      caches.match(key).then(
        (cached) => cached || network.catch(async () => (await caches.match("/")) || Response.error())
      )
    );
    event.waitUntil(network.catch(() => {}));
    return;
  }

  // Next.js client navigation payloads: network with a time limit. On failure Next falls back
  // to a full page load, which the navigation branch above serves from the cache.
  if (request.headers.get("RSC") === "1") {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((resolve) => setTimeout(() => resolve(Response.error()), RSC_TIMEOUT_MS)),
      ]).catch(() => Response.error())
    );
    return;
  }

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
