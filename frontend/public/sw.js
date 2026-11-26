/* Minimal Service Worker for LKA Portal Desktop & Mobile App Installation */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  /* Network-first passthrough so live API data is always fresh */
});
