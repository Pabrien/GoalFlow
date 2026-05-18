const cacheName = "goalflow-v1";
const coreAssets = [
  "./",
  "./index.html",
  "./styles.css?v=20260518-ui",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/goalflow-icon-512.png",
  "./icons/goalflow-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(coreAssets)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes("index.html") || client.url.endsWith("/"));
      if (existing) return existing.focus();
      return self.clients.openWindow("./index.html");
    }),
  );
});
