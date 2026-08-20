// ===== MANITA — Componentes compartidos (header/footer) — M013 =====
// Requiere que supabase-client.js esté cargado antes (usuarioActual, logout).

// Guard reutilizable: exige sesión, si no redirige a login con ?next= (M015)
async function requireAuth(nextUrl) {
  var user = await usuarioActual();
  if (!user) {
    window.location.href = 'login.html?next=' + encodeURIComponent(nextUrl || location.href);
    return null;
  }
  return user;
}

// Pinta el header consistente en cualquier página, reflejando la sesión real.
// Inserta la barra superior ANTES del cat-bar (si existe) para no destruirlo.
async function mountHeader(opts) {
  opts = opts || {};
  var el = document.getElementById('appHeader');
  if (!el) return;

  var user = null;
  try { user = await usuarioActual(); } catch (e) { user = null; }

  // Acción de cuenta según sesión (sin href="#" muertos — M014)
  var accountHtml = user
    ? '<a href="mis-reservas.html" class="nav-link">Mis reservas</a>' +
      '<a href="pro-panel.html" class="nav-link">Panel pro</a>' +
      '<a href="cuenta.html" class="nav-link">Mi cuenta</a>' +
      '<button type="button" class="btn btn-account" id="hdrLogout">Cerrar sesión</button>'
    : '<a href="ser-profesional.html" class="nav-link">Ofrecer servicios</a>' +
      '<a href="login.html" class="btn btn-account">👤 Acceder</a>';

  var searchHtml = opts.search === false ? '' :
    '<div class="header-search">' +
      '<div class="hs-field"><input type="text" id="hSearchCat" placeholder="¿Qué servicio?" aria-label="Servicio"></div>' +
      '<div class="hs-field hs-loc"><input type="text" id="hSearchLoc" placeholder="Dirección o colonia, CDMX" aria-label="Ubicación"></div>' +
      '<a href="categorias.html" class="btn btn-primary hs-btn">Buscar</a>' +
    '</div>';

  var barHtml =
    '<div class="container header-inner">' +
      '<a href="index.html" class="logo"><span class="logo-icon" aria-hidden="true">🤝</span><span class="logo-text">Manita</span></a>' +
      searchHtml +
      '<div class="header-actions" id="hdrActions">' + accountHtml + '</div>' +
      '<button type="button" class="hamburger" id="hdrHamburger" aria-label="Abrir menú" aria-expanded="false" aria-controls="hdrActions">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
    '</div>';

  // Inserta la barra al inicio del header, preservando cualquier cat-bar existente
  var bar = document.createElement('div');
  bar.innerHTML = barHtml;
  el.insertBefore(bar.firstChild, el.firstChild);

  var logoutBtn = document.getElementById('hdrLogout');
  if (logoutBtn) logoutBtn.onclick = async function(){ await logout(); window.location.href = 'index.html'; };

  // Menú móvil (hamburguesa) — M089/M090, accesible
  var burger = document.getElementById('hdrHamburger');
  var actions = document.getElementById('hdrActions');
  if (burger && actions) {
    burger.addEventListener('click', function () {
      var open = actions.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && actions.classList.contains('open')) {
        actions.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        burger.focus();
      }
    });
  }
}

// Genera el HTML de un estado vacío con marca (reutilizable en cualquier pantalla)
// opts: { icon, title, text, ctaText, ctaHref }
function emptyState(opts) {
  opts = opts || {};
  var cta = (opts.ctaText && opts.ctaHref)
    ? '<a class="btn btn-primary" href="' + opts.ctaHref + '">' + opts.ctaText + '</a>' : '';
  return '<div class="empty-state">' +
    '<div class="es-icon" aria-hidden="true">' + (opts.icon || '📭') + '</div>' +
    '<h3>' + (opts.title || 'Nada por aquí') + '</h3>' +
    (opts.text ? '<p>' + opts.text + '</p>' : '') +
    cta + '</div>';
}

function mountFooter() {
  var el = document.getElementById('appFooter');
  if (!el) return;
  el.innerHTML =
    '<div class="footer-bottom"><div class="container">© 2026 Manita® · Hecho en CDMX 🇲🇽 · ' +
    '<a href="legal.html" style="color:var(--light-gray)">Aviso de privacidad</a></div></div>';
}

// ===== MODO APP: barra de navegación inferior (tab bar tipo app nativa) =====
// Se activa cuando corre como PWA/APK instalada (standalone). En navegador de escritorio no aparece.
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.startsWith('android-app://');
}

// ===== SPLASH SCREEN (solo al abrir la app instalada) =====
// Se muestra una vez por sesión, refuerza la sensación de app nativa.
(function initSplash() {
  var force = new URLSearchParams(location.search).get('splash') === '1';
  if ((!isStandalone() && !force)) return;
  // Solo una vez por sesión (no en cada navegación entre páginas)
  try { if (sessionStorage.getItem('manita_splash') && !force) return; sessionStorage.setItem('manita_splash', '1'); } catch (e) {}

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var s = document.createElement('div');
  s.className = 'app-splash';
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML =
    '<div class="splash-logo"><span class="splash-icon">🤝</span><span class="splash-name">Manita</span></div>' +
    '<div class="splash-tag">Servicios a domicilio</div>';
  document.body.appendChild(s);

  var hold = reduce ? 200 : 1100;
  setTimeout(function () {
    s.classList.add('hide');
    setTimeout(function () { s.remove(); }, reduce ? 0 : 400);
  }, hold);
})();

async function mountBottomNav(active) {
  // Solo en modo app instalada, o si se fuerza con ?app=1 (para previsualizar)
  var force = new URLSearchParams(location.search).get('app') === '1';
  if (!isStandalone() && !force) return;

  document.body.classList.add('app-mode');
  // Transición de entrada suave (fade-in) — sensación app. Respeta reduce-motion vía CSS.
  document.body.classList.add('page-enter');

  var user = null;
  try { user = await usuarioActual(); } catch (e) {}
  var cuentaHref = user ? 'cuenta.html' : 'login.html';

  var tabs = [
    { id: 'buscar',    label: 'Buscar',    icon: '🔍', href: 'index.html' },
    { id: 'favoritos', label: 'Favoritos', icon: '🤍', href: 'favoritos.html' },
    { id: 'servicios', label: 'Servicios', icon: '📅', href: 'mis-reservas.html' },
    { id: 'mensajes',  label: 'Mensajes',  icon: '💬', href: 'mensajes.html' },
    { id: 'perfil',    label: 'Perfil',    icon: '👤', href: cuentaHref }
  ];

  var nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Navegación principal');
  nav.innerHTML = tabs.map(function (t) {
    var on = (t.id === active) ? ' active' : '';
    return '<a class="bn-item' + on + '" href="' + t.href + '"' + (on ? ' aria-current="page"' : '') + '>' +
      '<span class="bn-icon" aria-hidden="true">' + t.icon + '</span>' +
      '<span class="bn-label">' + t.label + '</span></a>';
  }).join('');
  document.body.appendChild(nav);
}

// ===== PWA: registro de service worker + botón de instalación (M045) =====
(function initPWA() {
  // Registrar el service worker (solo en http/https, no en file://)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  // Capturar el evento de instalación y ofrecer un botón discreto
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    window._manitaInstallPrompt = e; // disponible para botones de instalación en cualquier página
    showInstallButton();
  });

  function showInstallButton() {
    if (document.getElementById('pwaInstallBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'pwaInstallBtn';
    btn.type = 'button';
    btn.className = 'pwa-install';
    btn.innerHTML = '📲 Instalar app';
    btn.onclick = async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.remove();
    };
    document.body.appendChild(btn);
  }

  // Si ya está instalada, ocultar cualquier prompt
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('pwaInstallBtn');
    if (b) b.remove();
  });
})();
