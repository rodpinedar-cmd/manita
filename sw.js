// ===== MANITA — Service Worker (PWA) =====
// Estrategia:
//   - Shell (HTML/CSS/JS propios): cache-first con actualización en segundo plano.
//   - Supabase y APIs externas: NUNCA se cachean (datos frescos y sensibles).
const CACHE = 'manita-v1';
const SHELL = [
  './',
  './index.html',
  './servicios.html',
  './categorias.html',
  './como-funciona.html',
  './perfil.html',
  './ser-profesional.html',
  './mis-reservas.html',
  './pro-panel.html',
  './cuenta.html',
  './reserva-confirmada.html',
  './login.html',
  './legal.html',
  './manifest.json',
  './css/styles.css',
  './js/supabase-client.js',
  './js/components.js',
  './js/data.js',
  './js/app.js',
  './js/servicios.js',
  './js/perfil.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {})) // tolerante a fallos individuales
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Solo GET. Nunca interceptar POST/PUT (reservas, auth, etc.)
  if (req.method !== 'GET') return;

  // NUNCA cachear Supabase ni APIs externas (datos frescos, sesión, sensibles)
  const isExternal = url.origin !== self.location.origin;
  const isSupabase = /supabase\.co/.test(url.hostname);
  if (isSupabase || isExternal) {
    return; // deja pasar a la red directamente
  }

  // Shell propio: cache-first, actualiza en segundo plano
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached); // sin red: usa cache
      return cached || network;
    }).catch(() => caches.match('./index.html'))
  );
});
