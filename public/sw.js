
const CACHE = "gochati-site-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(["/", "/manifest.webmanifest"])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/") ||
    url.pathname.startsWith("/admin")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});

// Pokea Push Notification
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch {
    data = {};
  }

  const title = data.title || "GoChati · Admin";

  const options = {
    body: data.body || "Una arifa mpya ya GoChati.",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "gochati-admin",
    renotify: true,
    data: {
      url: data.url || "/admin?customer-care=1",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Bonyeza arifa kufungua ukurasa husika
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url ||
    "/admin?customer-care=1";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clients) => {
        for (const client of clients) {
          if (
            new URL(client.url).origin === self.location.origin
          ) {
            await client.navigate(targetUrl);
            return client.focus();
          }
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
