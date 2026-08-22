// ===== MANITA — Landing page logic =====

// Render category pills bar (with dropdown submenus)
function renderCatBar(el) {
  el.innerHTML = CATEGORIES.map(function(c) {
    var dropdown = '';
    var hasMenu = (c.groups && c.groups.length) || (c.sub && c.sub.length);
    if (c.groups && c.groups.length) {
      // Grouped dropdown (columns)
      dropdown = '<div class="cat-dropdown cat-dropdown-wide">' + c.groups.map(function(g) {
        return '<div class="cat-dropdown-col"><div class="cat-dropdown-head">' + g.icon + ' ' + g.name + '</div>' +
          g.items.map(function(s) {
            return '<a href="servicios.html?cat=' + c.id + '&sub=' + s.id + '" class="cat-dropdown-item small">' + s.name + '</a>';
          }).join('') + '</div>';
      }).join('') + '</div>';
    } else if (c.sub && c.sub.length) {
      dropdown = '<div class="cat-dropdown">' + c.sub.map(function(s) {
        return '<a href="servicios.html?cat=' + c.id + '&sub=' + s.id + '" class="cat-dropdown-item">' +
          '<span>' + s.icon + '</span>' + s.name + '</a>';
      }).join('') + '</div>';
    }
    return '<div class="cat-pill-wrap">' +
      '<a href="servicios.html?cat=' + c.id + '" class="cat-pill">' +
      '<span class="p-icon">' + c.icon + '</span>' + c.name +
      (hasMenu ? ' <span class="pill-caret">▾</span>' : '') + '</a>' +
      dropdown + '</div>';
  }).join('');
}
var catBar = document.getElementById('catBar');
if (catBar) { renderCatBar(catBar); bindDropdowns(catBar); }

// JS-based dropdown toggle (more reliable than CSS hover for local files)
function bindDropdowns(container) {
  var wraps = container.querySelectorAll('.cat-pill-wrap');
  for (var i = 0; i < wraps.length; i++) {
    (function(wrap) {
      var dd = wrap.querySelector('.cat-dropdown');
      if (!dd) return;
      var timer = null;
      wrap.addEventListener('mouseenter', function() {
        clearTimeout(timer);
        dd.style.display = dd.classList.contains('cat-dropdown-wide') ? 'flex' : 'block';
      });
      wrap.addEventListener('mouseleave', function() {
        timer = setTimeout(function() { dd.style.display = 'none'; }, 150);
      });
    })(wraps[i]);
  }
}

// Render categories grid (for categorias.html)
var catGrid = document.getElementById('categoriesGrid');
if (catGrid) {
  catGrid.innerHTML = CATEGORIES.map(function(c) {
    return '<a href="servicios.html?cat=' + c.id + '" class="category-card">' +
      '<div class="category-icon">' + c.icon + '</div>' +
      '<h3>' + c.name + '</h3>' +
      '<p>' + c.desc + '</p></a>';
  }).join('');
}

// Render popular (Unsplash photos, free license)
var popGrid = document.getElementById('popularGrid');
if (popGrid) {
  popGrid.innerHTML = POPULAR.map(function(p) {
    var badge = p.badge ? '<span class="popular-card-badge">' + p.badge + '</span>' : '';
    return '<a href="servicios.html?cat=' + p.id + '" class="popular-card">' +
      '<div class="popular-card-img">' + badge + '<img src="' + p.img + '" alt="' + p.name + '" loading="lazy"></div>' +
      '<div class="popular-card-body"><h3>' + p.name + '</h3></div></a>';
  }).join('');
}

// Testimonios REALES desde Supabase (sin datos inventados — PROFECO).
// La sección solo aparece si hay reseñas reales de clientes.
(function cargarTestimonios(){
  var grid = document.getElementById('testimonialsGrid');
  var sec = document.getElementById('testimonialsSection');
  if (!grid || typeof obtenerTestimonios !== 'function') return;
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  obtenerTestimonios(6).then(function(res){
    var list = (res && res.data) || [];
    if (!list.length) return; // se queda oculta
    grid.innerHTML = list.map(function(t){
      var servicio = (t.professionals && t.professionals.service_name) || 'Servicio';
      var estrellas = '★'.repeat(Math.max(1, Math.min(5, t.rating || 5)));
      return '<div class="testimonial">' +
        '<div class="testimonial-stars" aria-label="' + (t.rating||5) + ' de 5 estrellas">' + estrellas + '</div>' +
        '<p class="testimonial-text">"' + esc(t.comment) + '"</p>' +
        '<div class="testimonial-author"><span class="t-badge">✔️</span>' +
        '<div><strong>Cliente verificado</strong><span>' + esc(servicio) + '</span></div>' +
        '</div></div>';
    }).join('');
    sec.style.display = '';
  }).catch(function(){ /* sin conexión: la sección queda oculta */ });
})();

// Hero search → go to services
// Buscador central del hero (servicio + zona) → servicios.html
var heroSearchBox = document.getElementById('heroSearchBox');
if (heroSearchBox) {
  heroSearchBox.addEventListener('submit', function(e) {
    e.preventDefault();
    var q = (document.getElementById('heroQuery').value || '').trim();
    var z = (document.getElementById('heroZone').value || '').trim();
    var params = [];
    if (q) params.push('q=' + encodeURIComponent(q));
    if (z) params.push('zona=' + encodeURIComponent(z));
    window.location.href = 'servicios.html' + (params.length ? '?' + params.join('&') : '');
  });
}

// Chips de búsquedas populares: SERVICIOS específicos (no repetir las categorías de arriba)
var heroPop = document.getElementById('heroPopulares');
if (heroPop) {
  var populares = [
    { t: 'Limpieza de hogar', cat: 'limpieza', sub: 'limpieza' },
    { t: 'Plomería',          cat: 'hogar',    sub: 'plomeria' },
    { t: 'Manicura',          cat: 'belleza',  sub: 'manicura' },
    { t: 'Clases de inglés',  cat: 'clases',   sub: 'clases-ingles' },
    { t: 'Paseo de perros',   cat: 'mascotas', sub: 'paseo-perros' },
    { t: 'Electricista',      cat: 'hogar',    sub: 'electricista' }
  ];
  heroPop.insertAdjacentHTML('beforeend', populares.map(function(p){
    return '<a class="hp-chip" href="servicios.html?cat=' + p.cat + '&sub=' + p.sub + '">' + p.t + '</a>';
  }).join(''));
}

// QR Modal
function openQR(e) {
  if (e) e.preventDefault();
  var m = document.getElementById('qrModal');
  if (m) {
    // Detecta iPhone/iPad y muestra la pestaña correcta automáticamente
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    dlTab(isIOS ? 'ios' : 'android');
    m.classList.add('open');
  }
}

// Cambia entre pestañas Android / iPhone en el modal de descarga
function dlTab(which) {
  var isIos = which === 'ios';
  var pA = document.getElementById('paneAndroid'), pI = document.getElementById('paneIos');
  var tA = document.getElementById('tabAndroid'), tI = document.getElementById('tabIos');
  if (!pA || !pI) return;
  pA.style.display = isIos ? 'none' : 'block';
  pI.style.display = isIos ? 'block' : 'none';
  if (tA) { tA.classList.toggle('active', !isIos); tA.setAttribute('aria-selected', String(!isIos)); }
  if (tI) { tI.classList.toggle('active', isIos); tI.setAttribute('aria-selected', String(isIos)); }
}
function closeQR(e) {
  if (e) e.preventDefault();
  var m = document.getElementById('qrModal');
  if (m) m.classList.remove('open');
}
// Cerrar modal con Escape (accesibilidad)
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeQR(); });

// Botón "Instalar como app (PWA)" dentro del modal — usa el prompt diferido de components.js
(function () {
  var btn = document.getElementById('modalInstallBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    if (window._manitaInstallPrompt) {
      window._manitaInstallPrompt.prompt();
      window._manitaInstallPrompt.userChoice.then(function(){ window._manitaInstallPrompt = null; });
    } else {
      // Fallback: instrucción manual si el navegador no expone el prompt
      alertToast('Usa el menú del navegador → "Agregar a pantalla de inicio".');
    }
  });
})();

// Toast local mínimo para el index (sin depender de otros archivos)
function alertToast(msg) {
  var t = document.createElement('div');
  t.className = 'toast toast-info'; t.setAttribute('role','status'); t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.classList.add('show'); });
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 300); }, 3500);
}


// Si el APK aún no está publicado, evita links de descarga rotos:
// convierte los botones de "Descargar APK" en "Instalar como app" con aviso.
(function checkApk() {
  var apkLinks = document.querySelectorAll('a[href$="downloads/Manita.apk"], a[href="downloads/Manita.apk"]');
  if (!apkLinks.length) return;
  fetch('downloads/Manita.apk', { method: 'HEAD' }).then(function (r) {
    if (!r.ok) disableApk();
  }).catch(disableApk);

  function disableApk() {
    apkLinks.forEach(function (a) {
      a.removeAttribute('download');
      a.setAttribute('href', '#');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (window._manitaInstallPrompt) {
          window._manitaInstallPrompt.prompt();
        } else {
          alertToast('La app para Android estará disponible muy pronto. Por ahora, instálala desde el navegador.');
        }
      });
    });
  }
})();


// ===== HOME TIPO APP (cuando corre instalada) — estilo app, no landing =====
(function initAppHome() {
  var forced = new URLSearchParams(location.search).get('app') === '1';
  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true || document.referrer.startsWith('android-app://');
  if (!standalone && !forced) return; // en web normal se ve la landing

  var home = document.getElementById('appHome');
  if (!home) return;

  // Oculta TODAS las secciones de landing y el hero web
  document.querySelectorAll('section.hero, section.section, .cat-bar').forEach(function (s) {
    if (s.id !== 'appHome') s.style.display = 'none';
  });

  // Categorías principales como chips (usa CATEGORIES de data.js)
  var chips = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).map(function (c) {
    return '<a class="ah-chip" href="servicios.html?cat=' + c.id + '">' +
      '<span class="ah-chip-ic">' + c.icon + '</span>' + c.name + '</a>';
  }).join('');

  // Populares (usa POPULAR de data.js)
  var pops = (typeof POPULAR !== 'undefined' ? POPULAR : []).map(function (p) {
    return '<a class="ah-pop" href="servicios.html?cat=' + p.id + '">' +
      '<div class="ah-pop-img"><img src="' + p.img + '" alt="' + p.name + '" loading="lazy"></div>' +
      '<span>' + p.name + '</span></a>';
  }).join('');

  // Grid de categorías (tarjetas ordenadas, robusto en cualquier pantalla)
  var cats = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []);
  var catCards = cats.map(function (c) {
    return '<a class="ah-cat" href="servicios.html?cat=' + c.id + '" aria-label="' + c.name + '">' +
      '<span class="ah-cat-ic" aria-hidden="true">' + c.icon + '</span>' +
      '<span class="ah-cat-lb">' + c.name + '</span></a>';
  }).join('');

  home.style.display = 'block';
  home.innerHTML =
    '<div class="ah-hero">' +
      '<div class="ah-letter" aria-hidden="true">M</div>' +
      '<div class="ah-hero-top">' +
        '<div class="ah-brand"><span aria-hidden="true">🤝</span> Manita</div>' +
        '<button class="ah-gift" type="button" aria-label="Invita y gana" onclick="location.href=\'cuenta.html\'">🎁</button>' +
      '</div>' +
      '<button class="ah-loc" type="button" id="ahLoc" aria-label="Cambiar ubicación">📍 Ciudad de México <span aria-hidden="true">▾</span></button>' +
      '<a class="ah-searchbar" href="categorias.html"><span class="ic" aria-hidden="true">🔍</span><span class="tx">¿Qué servicio necesitas?</span></a>' +
    '</div>' +
    '<h2 class="ah-h">Categorías</h2>' +
    '<div class="ah-cats">' + catCards + '</div>' +
    '<div class="ah-repeat" id="ahRepeat" style="display:none;"></div>';

  // Tarjeta "repetir último servicio" si hay reservas previas
  if (typeof misReservas === 'function') {
    misReservas().then(function (res) {
      var b = (res.data || []).find(function (x) { return ['completed','reviewed'].includes(x.status); });
      if (!b) return;
      var el = document.getElementById('ahRepeat');
      var svc = b.professionals ? b.professionals.service_name : 'Servicio';
      el.innerHTML =
        '<a class="ah-repeat-card" href="perfil.html?id=' + (b.professional_id || '') + '">' +
          '<div class="ah-repeat-info"><small>Repetir servicio</small><strong>' + svc + '</strong>' +
          '<span>Último: ' + b.service_date + '</span></div>' +
          '<span class="ah-repeat-btn">Repetir</span></a>';
      el.style.display = 'block';
    }).catch(function () {});
  }
})();


// ===== Animación de aparición al hacer scroll (estilo Webel) =====
// Respeta prefers-reduced-motion: si el usuario prefiere menos movimiento, no anima.
(function initReveal() {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Marca las secciones de la landing como "reveal" (menos el hero, que ya anima al cargar)
  var secciones = document.querySelectorAll('.section, .trust-bar');
  if (!secciones.length) return;
  if (reduce || !('IntersectionObserver' in window)) return; // sin animación: se ven normales

  secciones.forEach(function(s){ s.classList.add('reveal'); });
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  secciones.forEach(function(s){ obs.observe(s); });
})();
