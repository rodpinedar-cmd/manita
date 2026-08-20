// ===== MANITA — Services listing =====

var params = new URLSearchParams(window.location.search);
var currentCat = params.get('cat') || 'all';
var currentSub = params.get('sub') || '';
var query = (params.get('q') || '').toLowerCase();

// If sub is set, derive parent cat and use sub name as search filter
if (currentSub) {
  var parentCat = getCatBySub(currentSub);
  if (parentCat) currentCat = parentCat.id;
}

// Render category pills bar (with dropdowns/groups)
var catBar = document.getElementById('catBar');
if (catBar) {
  catBar.innerHTML = CATEGORIES.map(function(c) {
    var dropdown = '';
    var hasMenu = (c.groups && c.groups.length) || (c.sub && c.sub.length);
    if (c.groups && c.groups.length) {
      dropdown = '<div class="cat-dropdown cat-dropdown-wide">' + c.groups.map(function(g) {
        return '<div class="cat-dropdown-col"><div class="cat-dropdown-head">' + g.icon + ' ' + g.name + '</div>' +
          g.items.map(function(s) {
            return '<a href="servicios.html?cat=' + c.id + '&sub=' + s.id + '" class="cat-dropdown-item small">' + s.name + '</a>';
          }).join('') + '</div>';
      }).join('') + '</div>';
    } else if (c.sub && c.sub.length) {
      dropdown = '<div class="cat-dropdown">' + c.sub.map(function(s) {
        return '<a href="servicios.html?cat=' + c.id + '&sub=' + s.id + '" class="cat-dropdown-item"><span>' + s.icon + '</span>' + s.name + '</a>';
      }).join('') + '</div>';
    }
    return '<div class="cat-pill-wrap"><a href="servicios.html?cat=' + c.id + '" class="cat-pill">' +
      '<span class="p-icon">' + c.icon + '</span>' + c.name +
      (hasMenu ? ' <span class="pill-caret">▾</span>' : '') + '</a>' + dropdown + '</div>';
  }).join('');
  // JS dropdown toggle
  var wraps = catBar.querySelectorAll('.cat-pill-wrap');
  for (var w = 0; w < wraps.length; w++) {
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
    })(wraps[w]);
  }
}

// Render category filters
var catFilters = document.getElementById('catFilters');
catFilters.innerHTML = '<label><input type="radio" name="cat" value="all" ' + (currentCat==='all'?'checked':'') + '> Todas</label>' +
  CATEGORIES.map(function(c) {
    return '<label><input type="radio" name="cat" value="' + c.id + '" ' + (currentCat===c.id?'checked':'') + '> ' + c.icon + ' ' + c.name + '</label>';
  }).join('');

catFilters.addEventListener('change', function(e) {
  currentCat = e.target.value;
  render();
});
document.getElementById('availToday').addEventListener('change', render);
document.getElementById('verifiedOnly').addEventListener('change', render);

var AVATARS = ['👩','🧑','👨','👩‍🦰','💇‍♀️','👨‍🔧','🧔‍♂️','👩‍🏫','🧑‍🎤','👧','👨‍⚕️','👩‍🦱','👷','🛼'];

async function render() {
  var list = document.getElementById('prosList');
  list.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';

  // Fetch from Supabase
  var res = await obtenerProfesionales(currentCat);
  if (res.error) {
    list.innerHTML = '<div class="state-error" role="alert">⚠️ No pudimos cargar los profesionales. Revisa tu conexión. <button class="btn btn-ghost" onclick="render()">Reintentar</button></div>';
    return;
  }
  var pros = res.data;

  // Text search
  if (query) {
    pros = pros.filter(function(p) {
      return (p.service_name || '').toLowerCase().indexOf(query) !== -1 ||
             (p.category_id || '').toLowerCase().indexOf(query) !== -1;
    });
  }
  // Subcategory filter
  if (currentSub) {
    var subName = getSubName(currentSub);
    if (subName) {
      var kw = subName.toLowerCase().split(' ')[0];
      var subFiltered = pros.filter(function(p){ return (p.service_name||'').toLowerCase().indexOf(kw) !== -1; });
      if (subFiltered.length > 0) pros = subFiltered;
    }
  }
  // Verified filter
  if (document.getElementById('verifiedOnly').checked) pros = pros.filter(function(p){ return p.verified; });
  if (document.getElementById('availToday').checked) pros = pros.filter(function(p){ return p.available; });

  // Title
  var cat = getCategory(currentCat);
  var subName2 = currentSub ? getSubName(currentSub) : null;
  document.getElementById('resultsTitle').textContent = subName2 || (cat ? cat.name : (query ? 'Resultados para "' + query + '"' : 'Todos los profesionales'));
  document.getElementById('resultsCount').textContent = pros.length + ' profesional' + (pros.length !== 1 ? 'es' : '') + ' en CDMX';

  if (pros.length === 0) {
    list.innerHTML = '<div class="empty">😕 No encontramos profesionales con esos filtros. Prueba con otra categoría.</div>';
    return;
  }

  list.innerHTML = pros.map(function(p) {
    // Solo se muestran badges basados en datos reales (verificado). Sin métricas inventadas.
    var verifiedBadge = p.verified ? '<span class="pro-badge badge-agenda">✔️ Verificado</span>' : '';
    var reviewsLabel = (p.reviews_count > 0)
      ? ('★ ' + p.rating + ' · ' + p.reviews_count + ' reseña' + (p.reviews_count !== 1 ? 's' : ''))
      : 'Sin reseñas todavía';

    return '<a href="perfil.html?id=' + p.id + '" class="pro-card">' +
      '<div class="pro-avatar">' + avatarFor(p) + '</div>' +
      '<div class="pro-main">' +
        '<div class="pro-name">' + escapeHtml(p.service_name) + (p.verified ? ' <span class="verified" title="Verificado">✔️</span>' : '') + '</div>' +
        '<div class="pro-rating">' + reviewsLabel + ' <span>· 📍 ' + escapeHtml(p.zone||'CDMX') + '</span></div>' +
        '<div class="pro-badges">' + verifiedBadge + '</div>' +
        '<p class="pro-bio">' + escapeHtml(p.bio||'') + '</p>' +
      '</div>' +
      '<div class="pro-right">' +
        '<div class="pro-price">$' + p.price + '<small>/ ' + escapeHtml(p.price_unit||'servicio') + '</small></div>' +
      '</div>' +
    '</a>';
  }).join('');
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
function avatarFor(p) {
  if (p.avatar_url) return '<img src="' + escapeHtml(p.avatar_url) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
  return (p.service_name || '?').trim().charAt(0).toUpperCase();
}

render();
