// ═══════════════════════════════════════════
// MH Live Sports — Service Worker
// Offline support & PWA caching
// Developer: MH RAFI
// ═══════════════════════════════════════════

const CACHE_NAME = 'mh-live-sports-v1';

// এগুলো offline এ cache থাকবে
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;600;700&family=Orbitron:wght@700&display=swap',
    'https://vjs.zencdn.net/8.10.0/video-js.css',
    'https://vjs.zencdn.net/8.10.0/video.min.js',
    'https://cdn.tailwindcss.com',
];

// ── Install: static assets cache করো ──
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS).catch(function(err) {
                console.log('Cache addAll partial error (ok):', err);
            });
        })
    );
    self.skipWaiting();
});

// ── Activate: পুরনো cache মুছো ──
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) { return key !== CACHE_NAME; })
                    .map(function(key) { return caches.delete(key); })
            );
        })
    );
    self.clients.claim();
});

// ── Fetch: cache-first strategy ──
self.addEventListener('fetch', function(event) {
    var url = event.request.url;

    // HLS stream request গুলো cache করবো না (live content)
    if (url.includes('.m3u8') || url.includes('.ts') || url.includes('.aac') || url.includes('toffeelive') || url.includes('tsports') || url.includes('streamhostingcdn')) {
        return; // network এ যাক
    }

    event.respondWith(
        caches.match(event.request).then(function(cachedResponse) {
            if (cachedResponse) {
                // cache এ আছে — সেটা দাও, background এ update করো
                fetch(event.request).then(function(networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(function() {});
                return cachedResponse;
            }

            // cache এ নেই — network থেকে আনো
            return fetch(event.request).then(function(networkResponse) {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }
                // cache এ রাখো
                var responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(function() {
                // সম্পূর্ণ offline — offline page দেখাও
                return caches.match('/') || caches.match('/index.html');
            });
        })
    );
});
