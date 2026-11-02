const CACHE = "gochati-site-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/") ||
    url.pathname.startsWith("/admin")
  )
    return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    /* Show a generic notice. */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Gochati · Admin", {
      body: data.body || "Arifa mpya ya admin.",
      tag: data.tag || "gochati-admin",
      data: { url: "/admin?customer-care=1" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (new URL(client.url).pathname === "/admin") {
          await client.navigate("/admin?customer-care=1");
          return client.focus();
        }
      }
      return self.clients.openWindow("/admin?customer-care=1");
    }),
  );
});
