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

function mountFooter() {
  var el = document.getElementById('appFooter');
  if (!el) return;
  el.innerHTML =
    '<div class="footer-bottom"><div class="container">© 2026 Manita® · Hecho en CDMX 🇲🇽 · ' +
    '<a href="legal.html" style="color:var(--light-gray)">Aviso de privacidad</a></div></div>';
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
