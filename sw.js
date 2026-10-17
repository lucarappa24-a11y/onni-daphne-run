// Service worker: salva il gioco sul telefono così funziona anche senza internet.
// VERSION e FILES vengono riscritti da tools/build.js a ogni pubblicazione.
const VERSION = 'v-141e9b44e1';
const FILES = ["./","index.html","dogrig.js","background.js","leaderboard.js","firebase-config.js","manifest.webmanifest","art/onni.svg","art/daphne.svg","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","art/rioni/ammanniti-1.png","art/rioni/badia-1.png","art/rioni/cassero-1.png","art/rioni/contrastanga-1.png","art/rioni/crocebianca-1.png","art/rioni/giotti-1.png","art/rioni/lamora-1.png","art/rioni/Morlupo.png","art/rioni/pugilli-1.png","art/rioni/spada-1.png","art/foto/onni_light_body.png","art/foto/onni_light_hind.png","art/foto/onni_light_front.png","art/foto/daphne_light_body.png","art/foto/daphne_light_hind.png","art/foto/daphne_light_front.png","art/ui/arrow-up.png","art/ui/arrow-down.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
