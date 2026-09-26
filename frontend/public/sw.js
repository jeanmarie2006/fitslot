/* Service worker : permet l'installation et l'usage hors connexion après la première visite. */
const VERSION = 'v1'
const CACHE = 'app-shell-' + VERSION
const SCOPE = self.registration.scope

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(SCOPE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('app-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Les appels d'API ne sont jamais mis en cache
  if (url.origin === location.origin && /\/api\//.test(url.pathname)) return

  // Pages : réseau d'abord, puis la coquille de l'application hors connexion
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(SCOPE, copy)); return res })
        .catch(() => caches.match(SCOPE).then((r) => r || Response.error()))
    )
    return
  }

  // Fichiers statiques et polices : cache d'abord, mise à jour en arrière-plan
  const cacheable = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|unpkg\.com|cdn\.jsdelivr\.net|tile\.openstreetmap\.org/.test(url.hostname)
  if (!cacheable) return
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
        return res
      }).catch(() => hit)
      return hit || net
    })
  )
})
