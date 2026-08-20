// ===== MANITA — Perfil profesional + reserva (Supabase, RPC-based) =====

var params = new URLSearchParams(window.location.search);
var proId = params.get('id');
var pro = null;

// Toast simple (sustituye alert/confirm)
function toast(msg, kind) {
  var t = document.createElement('div');
  t.className = 'toast toast-' + (kind || 'info');
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.classList.add('show'); });
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 300); }, 3200);
}

function layout() { return document.getElementById('profileLayout'); }

function showError(msg) {
  layout().innerHTML = '<div class="state-error" role="alert">⚠️ ' + msg +
    ' <button class="btn btn-ghost" onclick="loadProfile()">Reintentar</button></div>';
}

async function loadProfile() {
  if (!proId) { showError('Perfil no especificado.'); return; }
  layout().innerHTML = '<div class="state-loading"><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-side"></div></div>';

  var res = await obtenerProfesional(proId);
  if (res.error) { showError('No pudimos cargar el perfil. Revisa tu conexión.'); return; }
  pro = res.data;
  if (!pro) {
    layout().innerHTML = '<div class="state-empty">Profesional no encontrado. <a href="categorias.html">Ver categorías</a></div>';
    return;
  }

  var cat = getCategory(pro.category_id);
  document.getElementById('breadcrumb').innerHTML =
    '<a href="index.html">Inicio</a> / <a href="servicios.html?cat=' + pro.category_id + '">' +
    (cat ? cat.name : 'Servicios') + '</a> / ' + escapeHtml(pro.service_name);

  renderProfile(cat);
  loadReviews();
}

function renderProfile(cat) {
  layout().innerHTML =
    '<div>' +
      '<div class="profile-header"><div class="profile-top">' +
        '<div class="profile-avatar">' + avatarFor(pro) + '</div>' +
        '<div>' +
          '<div class="profile-name">' + escapeHtml(pro.service_name) + (pro.verified ? ' <span class="verified" title="Verificado">✔️</span>' : '') + '</div>' +
          '<div class="profile-service">' + (cat ? cat.name : '') + '</div>' +
          '<div class="profile-meta">' +
            '<span class="rating-big">★ ' + (pro.rating || 0) + '</span>' +
            '<span>(' + (pro.reviews_count || 0) + ' reseñas)</span>' +
            '<span>📍 ' + escapeHtml(pro.zone || 'CDMX') + '</span>' +
            (pro.available ? '<span>✅ Disponible</span>' : '') +
          '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="section-block"><h2>Sobre mí</h2><p style="color:var(--gray)">' + escapeHtml(pro.bio || '') + '</p></div>' +
      '<div class="section-block"><h2>Reseñas</h2><div id="reviewsBox"><div class="skeleton skeleton-line"></div></div></div>' +
    '</div>' +
    '<div><div class="booking-card">' +
      '<div class="booking-price">$' + pro.price + ' <small>/ ' + escapeHtml(pro.price_unit || 'servicio') + '</small></div>' +
      '<p style="color:var(--gray);font-size:13px;margin-bottom:16px;">Reserva tu servicio</p>' +
      '<div class="booking-field"><label for="bookDate">Fecha</label><input type="date" id="bookDate"></div>' +
      '<div class="booking-field"><label for="bookTime">Hora</label><select id="bookTime"><option value="">Elige fecha primero</option></select></div>' +
      '<div class="booking-field"><label for="bookAddr">Dirección</label><input type="text" id="bookAddr" placeholder="Tu dirección en CDMX"></div>' +
      '<div class="booking-total"><span>Total</span><span>$' + pro.price + ' MXN</span></div>' +
      '<button class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;" id="bookBtn">Reservar ahora</button>' +
      '<div class="guarantee">🛡️ Garantía Manita: tu dinero queda protegido hasta que confirmes que el servicio salió bien.</div>' +
    '</div></div>';

  var today = new Date().toISOString().split('T')[0];
  var dateInput = document.getElementById('bookDate');
  dateInput.min = today;
  dateInput.value = today;
  dateInput.onchange = refreshSlots;
  document.getElementById('bookBtn').onclick = bookNow;
  loadAvailability();
}

// Carga la disponibilidad publicada del profesional y genera slots por día
var AVAIL = [];
async function loadAvailability() {
  var res = await disponibilidadProfesional(pro.id);
  AVAIL = res.data || [];
  refreshSlots();
}

// Genera opciones de hora válidas según el horario del pro para la fecha elegida.
// Los slots se separan por la duración del servicio (pro.duration_min).
function refreshSlots() {
  var sel = document.getElementById('bookTime');
  if (!sel) return;
  var dateVal = document.getElementById('bookDate').value;
  if (!dateVal) { sel.innerHTML = '<option value="">Elige fecha primero</option>'; return; }

  var weekday = new Date(dateVal + 'T00:00:00').getDay(); // 0=domingo..6=sábado
  var franjas = AVAIL.filter(function(a){ return a.weekday === weekday; });
  if (!franjas.length) {
    sel.innerHTML = '<option value="">Sin disponibilidad este día</option>';
    return;
  }
  var dur = pro.duration_min || 60;
  var opts = [];
  franjas.forEach(function(f){
    var start = toMin(f.start_time), end = toMin(f.end_time);
    for (var m = start; m + dur <= end; m += dur) {
      opts.push(fromMin(m));
    }
  });
  sel.innerHTML = opts.length
    ? opts.map(function(h){ return '<option value="'+h+'">'+h+'</option>'; }).join('')
    : '<option value="">Sin horarios disponibles</option>';
}
function toMin(t){ var p = String(t).split(':'); return parseInt(p[0])*60 + parseInt(p[1]||'0'); }
function fromMin(m){ var h = Math.floor(m/60), mm = m%60; return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm; }

async function loadReviews() {
  var box = document.getElementById('reviewsBox');
  if (!box) return;
  var res = await obtenerReseñas(proId);
  if (res.error) { box.innerHTML = '<div class="state-error">No se pudieron cargar las reseñas.</div>'; return; }
  if (!res.data.length) {
    box.innerHTML = '<div class="state-empty">Aún no hay reseñas. Sé el primero en dejar una tras tu servicio.</div>';
    return;
  }
  box.innerHTML = res.data.map(function(r) {
    return '<div class="review"><div class="review-head">' +
      '<span class="review-author">Cliente</span>' +
      '<span class="review-stars">' + '★'.repeat(r.rating) + '</span></div>' +
      '<div class="review-text">' + escapeHtml(r.comment || '') + '</div></div>';
  }).join('');
}

async function bookNow() {
  var date = document.getElementById('bookDate').value;
  var time = document.getElementById('bookTime').value;
  var addr = document.getElementById('bookAddr').value.trim();
  var btn = document.getElementById('bookBtn');

  if (!time) { toast('Elige un horario disponible.', 'error'); return; }
  if (!addr) { toast('Por favor ingresa tu dirección.', 'error'); return; }

  var user = await usuarioActual();
  if (!user) {
    toast('Necesitas iniciar sesión para reservar.', 'info');
    setTimeout(function(){ window.location.href = 'login.html?next=' + encodeURIComponent(window.location.href); }, 900);
    return;
  }

  btn.textContent = 'Reservando...'; btn.disabled = true;

  // Construye timestamp start_at desde fecha+hora seleccionadas (hora local CDMX del navegador)
  var startAt = new Date(date + 'T' + time + ':00').toISOString();
  // idempotency_key estable para este intento (evita duplicados por doble click / reintentos)
  if (!window._bookingKey) window._bookingKey = 'bk-' + pro.id + '-' + startAt + '-' + Date.now();

  // El precio NO se envía: lo calcula el servidor (crear_reserva RPC)
  var res = await crearReserva({
    professional_id: pro.id,
    start_at: startAt,
    address: addr,
    idempotency_key: window._bookingKey
  });

  btn.textContent = 'Reservar ahora'; btn.disabled = false;

  if (res.error) { toast(res.error.message, 'error'); return; }

  // Reserva creada (pending). Redirige a confirmación real (M028)
  var b = Array.isArray(res.data) ? res.data[0] : res.data;
  window.location.href = 'reserva-confirmada.html?id=' + (b ? b.id : '');
}

// Helpers
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
function avatarFor(p) {
  if (p.avatar_url) return '<img src="' + escapeHtml(p.avatar_url) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
  var name = (p.service_name || '?').trim();
  return name.charAt(0).toUpperCase();
}

loadProfile();
