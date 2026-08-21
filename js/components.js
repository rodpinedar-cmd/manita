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

// ===== FAVORITOS (localStorage) — funciona con o sin sesión, sin backend nuevo =====
// Guarda un mapa id -> { id, service_name, price, price_unit, zone, category_id, verified }
var MANITA_FAV_KEY = 'manita_favoritos';
function favGetAll() {
  try { return JSON.parse(localStorage.getItem(MANITA_FAV_KEY) || '{}'); } catch (e) { return {}; }
}
function favIds() { return Object.keys(favGetAll()); }
function esFavorito(id) { return !!favGetAll()[id]; }
function favSave(map) { try { localStorage.setItem(MANITA_FAV_KEY, JSON.stringify(map)); } catch (e) {} }
// Alterna favorito. `pro` es opcional (objeto con datos para mostrar en la página de favoritos).
function toggleFavorito(id, pro) {
  var map = favGetAll();
  if (map[id]) { delete map[id]; favSave(map); return false; }
  map[id] = pro ? {
    id: id, service_name: pro.service_name, price: pro.price, price_unit: pro.price_unit,
    zone: pro.zone, category_id: pro.category_id, verified: !!pro.verified
  } : { id: id };
  favSave(map);
  return true;
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
    '<a href="legal.html#terminos" style="color:var(--light-gray)">Términos</a> · ' +
    '<a href="legal.html#privacidad" style="color:var(--light-gray)">Privacidad</a> · ' +
    '<a href="legal.html#reembolsos" style="color:var(--light-gray)">Reembolsos</a></div></div>';
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

// ===== ONBOARDING DE BIENVENIDA (solo la primera vez en modo app) =====
// 3 slides que explican qué es Manita, cómo funciona y la garantía de confianza.
// Se muestra una única vez (localStorage). Se puede forzar con ?onboarding=1 para pruebas.
// Accesible: role=dialog, foco atrapado básico, botón saltar, respeta prefers-reduced-motion.
(function initOnboarding() {
  var force = new URLSearchParams(location.search).get('onboarding') === '1';
  if (!isStandalone() && !force) return;
  try { if (localStorage.getItem('manita_onboarding') && !force) return; } catch (e) {}

  var SLIDES = [
    { icon: '🤝', title: 'Bienvenido a Manita', text: 'Encuentra profesionales de confianza para tu hogar en CDMX: limpieza, plomería, electricidad y mucho más.' },
    { icon: '📅', title: 'Reserva en segundos', text: 'Elige el servicio, la fecha y confirma. Ves el precio claro desde el inicio, sin sorpresas ni letras chiquitas.' },
    { icon: '🛡️', title: 'Con toda tranquilidad', text: 'Profesionales verificados, reseñas reales y pago protegido. Tú marcas cuándo el trabajo quedó bien hecho.' }
  ];

  function markDone() { try { localStorage.setItem('manita_onboarding', '1'); } catch (e) {} }

  var ov = document.createElement('div');
  ov.className = 'onboarding';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Bienvenida a Manita');

  var slidesHtml = SLIDES.map(function (sl, i) {
    return '<div class="ob-slide' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' +
      '<div class="ob-icon" aria-hidden="true">' + sl.icon + '</div>' +
      '<h2 class="ob-title">' + sl.title + '</h2>' +
      '<p class="ob-text">' + sl.text + '</p>' +
    '</div>';
  }).join('');

  var dotsHtml = SLIDES.map(function (_, i) {
    return '<span class="ob-dot' + (i === 0 ? ' active' : '') + '" data-dot="' + i + '"></span>';
  }).join('');

  ov.innerHTML =
    '<button type="button" class="ob-skip" id="obSkip">Saltar</button>' +
    '<div class="ob-viewport">' + slidesHtml + '</div>' +
    '<div class="ob-dots" aria-hidden="true">' + dotsHtml + '</div>' +
    '<div class="ob-actions">' +
      '<button type="button" class="btn btn-primary btn-lg ob-next" id="obNext">Siguiente</button>' +
    '</div>';

  document.body.appendChild(ov);
  document.body.classList.add('ob-open');

  var idx = 0;
  var slides = ov.querySelectorAll('.ob-slide');
  var dots = ov.querySelectorAll('.ob-dot');
  var nextBtn = ov.querySelector('#obNext');
  var skipBtn = ov.querySelector('#obSkip');

  function render() {
    for (var i = 0; i < slides.length; i++) {
      slides[i].classList.toggle('active', i === idx);
      dots[i].classList.toggle('active', i === idx);
    }
    nextBtn.textContent = (idx === SLIDES.length - 1) ? 'Empezar' : 'Siguiente';
  }

  function close() {
    markDone();
    document.body.classList.remove('ob-open');
    ov.classList.add('hide');
    var reduceM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () { ov.remove(); }, reduceM ? 0 : 300);
  }

  nextBtn.addEventListener('click', function () {
    if (idx < SLIDES.length - 1) { idx++; render(); nextBtn.focus(); }
    else { close(); }
  });
  skipBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('ob-open')) close();
  });

  render();
  setTimeout(function () { nextBtn.focus(); }, 100);
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
    { id: 'mensajes',  label: 'Actividad',  icon: '🔔', href: 'mensajes.html' },
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

// ===== BANNER iOS: "instálame desde Safari" =====
// iOS no dispara beforeinstallprompt: hay que guiar manualmente (Compartir → Agregar a inicio).
// Se muestra solo en iPhone/iPad con Safari, cuando NO está instalada, una vez (localStorage).
(function initIosInstallHint() {
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return;
  // Safari real (no Chrome/Firefox/otros webviews de iOS, que no permiten "Agregar a inicio")
  var isSafari = /^((?!chrome|crios|fxios|edgios|opios).)*safari/i.test(ua);
  if (!isSafari) return;
  if (isStandalone()) return; // ya instalada
  try { if (localStorage.getItem('manita_ios_hint')) return; } catch (e) {}

  var force = new URLSearchParams(location.search).get('ioshint') === '1';
  // Espera breve para no competir con el splash
  setTimeout(function () {
    if (document.getElementById('iosHint')) return;
    var b = document.createElement('div');
    b.id = 'iosHint';
    b.className = 'ios-hint';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Instalar Manita en tu iPhone');
    b.innerHTML =
      '<span class="ih-icon" aria-hidden="true">🤝</span>' +
      '<span class="ih-body"><strong>Instala Manita en tu iPhone</strong>' +
      'Toca <span aria-hidden="true">⬆️</span> Compartir y luego “Agregar a pantalla de inicio”.</span>' +
      '<span class="ih-arrow" aria-hidden="true">👇</span>' +
      '<button type="button" class="ih-close" id="iosHintClose" aria-label="Cerrar">✕</button>';
    document.body.appendChild(b);
    document.getElementById('iosHintClose').addEventListener('click', function () {
      try { localStorage.setItem('manita_ios_hint', '1'); } catch (e) {}
      b.remove();
    });
  }, force ? 0 : 1600);
})();

// ===== PWA: registro de service worker + botón de instalación (M045) =====
(function initPWA() {
  // Registrar el service worker (solo en http/https, no en file://)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        // Si hay una versión nueva esperando, actívala de inmediato
        function promote(w) {
          if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) {
              w.postMessage('SKIP_WAITING');
            }
          });
        }
        if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
        promote(reg.installing);
        reg.addEventListener('updatefound', function () { promote(reg.installing); });
      }).catch(function () {});

      // Cuando el SW nuevo toma control, recarga una vez para servir la versión fresca
      var refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshed) return;
        refreshed = true;
        window.location.reload();
      });
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
