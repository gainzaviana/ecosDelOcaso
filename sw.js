// Offline support: the game files are cached on install; the pixel font is cached the first time it
// loads. Network first for the game files so updates arrive as soon as you're online.
const CACHE = "ecos-v3";
const FILES = [
  "./", "./index.html", "./styles.css", "./manifest.webmanifest",
  "./js/main.js", "./js/ui.js", "./js/engine.js", "./js/combat.js", "./js/characters.js", "./js/enemies.js", "./js/story.js", "./js/pixelRenderer.js", "./js/sprites.js", "./js/vfx.js",
  "./js/chapters/ch1.js", "./js/chapters/ch2.js", "./js/chapters/ch3.js", "./js/chapters/ch4.js", "./js/chapters/ch5.js",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png",
];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (font) {
    // Cache first for the font (it never changes).
    e.respondWith(caches.match(req).then((hit) => hit ?? fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit ?? caches.match("./index.html"))));
});
