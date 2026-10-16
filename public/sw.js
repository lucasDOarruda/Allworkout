// Offline support: lets the app open and keep working without internet (e.g. mid-workout in a
// gym basement). Pages: network first, falling back to the last cached copy. Built assets have
// hashed names, so they're cached forever. Nothing from other sites, the API, or Firebase is
// touched, and big model files aren't stored.
const CACHE = 'aw-shell-v2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // The app page: try the network, keep a copy, use the copy when offline.
  // Other pages (the SEO landing pages) are left to the network.
  if (req.mode === 'navigate' && url.pathname !== '/' && url.pathname !== '/index.html') return
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/').then((r) => r || caches.match(req))),
    )
    return
  }

  // Hashed build files and images: cache first
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/img/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
