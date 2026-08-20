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
  if (m) m.classList.add('open');
}
function closeQR(e) {
  if (e) e.preventDefault();
  var m = document.getElementById('qrModal');
  if (m) m.classList.remove('open');
}
