// Minimal service worker: caches the app shell so it opens offline. The client
// data (/api/*) is always fetched fresh from the network, never cached.
const CACHE = "carmaint-web-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never cache API calls — the client's data must be live.
  if (url.pathname.includes("/api/")) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});

// ---- Notifiche push (promemoria manutenzione dall'officina) ----
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || "Manutenzione auto";
  const opts = {
    body: d.body || "Hai una scadenza da controllare.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: d.tag || "carmaint-reminder",
    renotify: true,
    data: { url: d.url || "./" },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) { if ("focus" in w) return w.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
