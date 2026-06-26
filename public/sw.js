importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

workbox.setConfig({ debug: false });

// Cache static assets (JS, CSS, fonts, images) with CacheFirst
workbox.routing.registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image",
  new workbox.strategies.CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Cache navigation requests (pages) with StaleWhileRevalidate
workbox.routing.registerRoute(
  ({ request }) => request.mode === "navigate",
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "pages",
  }),
);

// Cache Supabase API responses with NetworkFirst
workbox.routing.registerRoute(
  ({ url }) => url.hostname.includes("supabase.co"),
  new workbox.strategies.NetworkFirst({
    cacheName: "api",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60,
      }),
    ],
  }),
);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(self.clients.claim()),
);
