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
      '<div class="header-actions">' + accountHtml + '</div>' +
    '</div>';

  // Inserta la barra al inicio del header, preservando cualquier cat-bar existente
  var bar = document.createElement('div');
  bar.innerHTML = barHtml;
  el.insertBefore(bar.firstChild, el.firstChild);

  var logoutBtn = document.getElementById('hdrLogout');
  if (logoutBtn) logoutBtn.onclick = async function(){ await logout(); window.location.href = 'index.html'; };
}

function mountFooter() {
  var el = document.getElementById('appFooter');
  if (!el) return;
  el.innerHTML =
    '<div class="footer-bottom"><div class="container">© 2026 Manita® · Hecho en CDMX 🇲🇽 · ' +
    '<a href="legal.html" style="color:var(--light-gray)">Aviso de privacidad</a></div></div>';
}
