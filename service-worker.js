const CACHE_NAME = "game-cache-v1";
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/style.css",
    "/landing.js",
    "/single.js",
    "/versus.js",
    "/manifest.json",
    "/words.txt",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(
                names.map(name => {
                    if (name !== CACHE_NAME) return caches.delete(name);
                })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(resp => resp || fetch(event.request))
    );
});
