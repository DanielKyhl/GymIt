// GymIt's service worker: what makes the installed app open without a network.
//
// Two strategies, on purpose:
//  - Navigations go to the network first, so a fresh deploy shows up the next
//    time you open the app online, and fall back to the cached shell when
//    there's no signal.
//  - Everything under /_expo/ and /assets/ is content-hashed by the export, so
//    a cached copy can never be stale: serve it from the cache and only fetch
//    what's missing.
//
// Bump CACHE when the caching rules themselves change; hashed filenames handle
// ordinary deploys.
const CACHE = "gymit-v1";
const SHELL = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([SHELL, "/manifest.json"]))
      .then(() => self.skipWaiting())
  );
});

// Take over open tabs and drop caches from older versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isHashedAsset = (url) => url.pathname.startsWith("/_expo/") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch other origins: Firestore and Auth must reach the network, and
  // their responses are not ours to store.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit || Response.error()))
    );
    return;
  }

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            // Only a real response is worth keeping; an error page is not.
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
