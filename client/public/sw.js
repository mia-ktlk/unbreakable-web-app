const CACHE_NAME = "unbreakable-summit-v6";
const BASE = new URL("./", self.location.href).pathname;
const ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}data/speakers.json`,
  `${BASE}data/schedule.json`,
  `${BASE}data/sponsors.json`,
  `${BASE}data/courses.json`,
  `${BASE}data/exhibitors.json`,
  `${BASE}data/members.json`,
];

function isCacheableRequest(request) {
  const url = new URL(request.url);
  return (
    url.origin === self.location.origin &&
    (url.protocol === "http:" || url.protocol === "https:")
  );
}

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
  if (e.request.method !== "GET") return;
  if (!isCacheableRequest(e.request)) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone).catch(() => {});
          });
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedRes) => {
          if (cachedRes) {
            return cachedRes;
          }
          if (e.request.mode === "navigate") {
            return caches.match(`${BASE}index.html`);
          }
        });
      })
  );
});
