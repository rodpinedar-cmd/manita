// ===== MANITA — Service Worker (PWA) =====
// Estrategia:
//   - Navegación (HTML) y assets propios (CSS/JS): NETWORK-FIRST.
//       Siempre intenta la versión más reciente de la red; si no hay conexión, usa la copia en caché.
//       Esto evita que los usuarios se queden con una versión vieja tras un deploy.
//   - Supabase y APIs externas: NUNCA se cachean (datos frescos y sensibles).
// IMPORTANTE: sube el número de versión del caché en cada release para forzar limpieza.
const CACHE = 'manita-v4-azul';
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
  './admin.html',
  './manifest.json',
  './css/styles.css?v=3',
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

// Permite que la página fuerce la activación inmediata del SW nuevo
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
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

  // NETWORK-FIRST para el shell propio: siempre lo más reciente; caché como respaldo offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
