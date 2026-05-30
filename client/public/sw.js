const CACHE_NAME = "unbreakable-summit-v2";
const BASE = new URL("./", self.location.href).pathname;
const ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}data/speakers.json`,
  `${BASE}data/schedule.json`,
  `${BASE}data/sponsors.json`,
  `${BASE}data/exhibitors.json`,
  `${BASE}data/members.json`,
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network First, fallback to Cache)
self.addEventListener("fetch", (e) => {
  // Only handle GET requests
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Clone response and save to cache
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });
        return res;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(e.request).then((cachedRes) => {
          if (cachedRes) {
            return cachedRes;
          }
          // If fallback is index.html
          if (e.request.mode === "navigate") {
            return caches.match(`${BASE}index.html`);
          }
        });
      })
  );
});
