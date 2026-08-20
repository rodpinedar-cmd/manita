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

// Render testimonials (Unsplash portraits, free license)
var testEl = document.getElementById('testimonials');
if (testEl) {
  testEl.innerHTML = TESTIMONIALS.map(function(t) {
    return '<div class="testimonial">' +
      '<div class="testimonial-stars">★★★★★</div>' +
      '<p class="testimonial-text">"' + t.text + '"</p>' +
      '<div class="testimonial-author">' +
      '<img class="t-avatar" src="' + t.img + '" alt="' + t.name + '" loading="lazy">' +
      '<div><strong>' + t.name + '</strong><span>' + t.service + '</span></div>' +
      '</div></div>';
  }).join('');
}

// Hero search → go to services
var heroSearch = document.getElementById('heroSearch');
if (heroSearch) {
  heroSearch.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var q = this.value.trim().toLowerCase();
      window.location.href = 'servicios.html?q=' + encodeURIComponent(q);
    }
  });
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

  home.style.display = 'block';
  home.innerHTML =
    '<div class="ah-top">' +
      '<div class="ah-hi" id="ahHi">¿Qué necesitas hoy?</div>' +
      '<a class="ah-search" href="categorias.html"><span>🔍</span> Buscar un servicio…</a>' +
    '</div>' +
    '<div class="ah-section"><h2>Categorías</h2><div class="ah-chips">' + chips + '</div></div>' +
    '<div class="ah-section"><h2>Populares en tu zona</h2><div class="ah-pops">' + pops + '</div></div>' +
    '<div class="ah-section"><a class="btn btn-primary btn-lg" style="width:100%;" href="categorias.html">Explorar todos los servicios</a></div>';

  // Saludo personalizado si hay sesión
  if (typeof usuarioActual === 'function') {
    usuarioActual().then(function (u) {
      if (u) {
        var nombre = (u.user_metadata && u.user_metadata.full_name) ? u.user_metadata.full_name.split(' ')[0] : '';
        var hi = document.getElementById('ahHi');
        if (hi && nombre) hi.textContent = 'Hola, ' + nombre + ' 👋';
      }
    }).catch(function () {});
  }
})();