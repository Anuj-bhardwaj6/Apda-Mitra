// APDA MITRA (आपदा मित्र) - Service Worker
// Offline Resilience, Tile Caching & CAP-CP Emergency Push Notifications

const CACHE_NAME = "apda-mitra-v1";
const OFFLINE_URL = "/offline.html";

// Essential assets to cache on install
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Precache partial error (ignored):", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First for dynamic APIs, Cache-First for static assets and map tiles
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and chrome-extension schemes
  if (event.request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // 1. Map Tiles (OpenStreetMap / Carto / Esri) - Cache-First for Offline Navigation
  if (
    url.hostname.includes("tile.openstreetmap.org") ||
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.hostname.includes("arcgisonline.com")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open("apda-mitra-maptiles").then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return empty transparent tile fallback if completely offline
            return new Response("", { status: 408, statusText: "Offline Tile" });
          });
      })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images, Fonts) - Stale-While-Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. Navigation & API Requests - Network First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // If html navigation request fails, return cached home
        if (event.request.headers.get("accept")?.includes("text/html")) {
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;
        }
        return new Response("Offline - Disaster Safety System Active", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      })
  );
});

// Push Notifications (CAP-CP Cell Broadcast & Evacuation Orders)
self.addEventListener("push", (event) => {
  let alertData = {
    title: "NDMA SACHET Emergency Alert",
    body: "Critical weather or evacuation advisory active in your district.",
    url: "/",
  };

  if (event.data) {
    try {
      alertData = event.data.json();
    } catch {
      alertData.body = event.data.text();
    }
  }

  const options = {
    body: alertData.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [500, 200, 500, 200, 500],
    tag: "apda-mitra-geofence-alert",
    renotify: true,
    requireInteraction: true,
    data: {
      url: alertData.url || "/",
    },
    actions: [
      { action: "view_safe_route", title: "View Evacuation Route" },
      { action: "call_112", title: "Call Emergency (112)" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(alertData.title, options)
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "call_112") {
    // Open dialer
    clients.openWindow("tel:112");
    return;
  }

  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
