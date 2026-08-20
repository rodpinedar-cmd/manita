// ===== MANITA — Perfil profesional + reserva (Supabase) =====

var params = new URLSearchParams(window.location.search);
var proId = params.get('id');
var pro = null;

var SAMPLE_REVIEWS = [
  { author: 'María G.', stars: 5, text: 'Excelente servicio, muy profesional y puntual. Totalmente recomendable.' },
  { author: 'Pedro L.', stars: 5, text: 'Quedó todo impecable. Repetiré sin duda.' },
  { author: 'Andrea M.', stars: 4, text: 'Muy buen trabajo, llegó a tiempo y fue muy amable.' }
];

async function loadProfile() {
  var res = await obtenerProfesional(proId);
  pro = res.data;

  if (!pro) {
    document.getElementById('profileLayout').innerHTML = '<div style="padding:60px;text-align:center;">Profesional no encontrado. <a href="categorias.html" style="color:var(--primary)">Ver categorías</a></div>';
    return;
  }

  var cat = getCategory(pro.category_id);
  document.getElementById('breadcrumb').innerHTML =
    '<a href="index.html">Inicio</a> / <a href="servicios.html?cat=' + pro.category_id + '">' + (cat ? cat.name : 'Servicios') + '</a> / ' + pro.service_name;

  var reviewsHtml = SAMPLE_REVIEWS.map(function(r) {
    return '<div class="review"><div class="review-head">' +
      '<span class="review-author">' + r.author + '</span>' +
      '<span class="review-stars">' + '★'.repeat(r.stars) + '</span></div>' +
      '<div class="review-text">' + r.text + '</div></div>';
  }).join('');

  document.getElementById('profileLayout').innerHTML =
    '<div>' +
      '<div class="profile-header">' +
        '<div class="profile-top">' +
          '<div class="profile-avatar">🧑</div>' +
          '<div>' +
            '<div class="profile-name">' + pro.service_name + (pro.verified ? ' <span class="verified">✔️</span>' : '') + '</div>' +
            '<div class="profile-service">' + (cat ? cat.name : '') + '</div>' +
            '<div class="profile-meta">' +
              '<span class="rating-big">★ ' + pro.rating + '</span>' +
              '<span>(' + pro.reviews_count + ' reseñas)</span>' +
              '<span>📍 ' + (pro.zone || 'CDMX') + '</span>' +
              (pro.available ? '<span>✅ Disponible</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="section-block"><h2>Sobre mí</h2><p style="color:var(--gray)">' + (pro.bio || '') + '</p></div>' +
      '<div class="section-block"><h2>Reseñas (' + pro.reviews_count + ')</h2>' + reviewsHtml + '</div>' +
    '</div>' +
    '<div>' +
      '<div class="booking-card">' +
        '<div class="booking-price">$' + pro.price + ' <small>/ ' + pro.price_unit + '</small></div>' +
        '<p style="color:var(--gray);font-size:13px;margin-bottom:16px;">Reserva tu servicio</p>' +
        '<div class="booking-field"><label>Fecha</label><input type="date" id="bookDate"></div>' +
        '<div class="booking-field"><label>Hora</label><select id="bookTime">' +
          '<option>09:00</option><option>11:00</option><option>13:00</option><option>15:00</option><option>17:00</option>' +
        '</select></div>' +
        '<div class="booking-field"><label>Dirección</label><input type="text" id="bookAddr" placeholder="Tu dirección en CDMX"></div>' +
        '<div class="booking-total"><span>Total</span><span>$' + pro.price + ' MXN</span></div>' +
        '<button class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;" id="bookBtn">Reservar ahora</button>' +
        '<div class="guarantee">🛡️ Garantía Manita: tu dinero protegido hasta que confirmes que todo salió bien.</div>' +
      '</div>' +
    '</div>';

  var today = new Date().toISOString().split('T')[0];
  var dateInput = document.getElementById('bookDate');
  dateInput.min = today;
  dateInput.value = today;

  document.getElementById('bookBtn').onclick = bookNow;
}

async function bookNow() {
  var date = document.getElementById('bookDate').value;
  var time = document.getElementById('bookTime').value;
  var addr = document.getElementById('bookAddr').value.trim();
  if (!addr) { alert('Por favor ingresa tu dirección.'); return; }

  var user = await usuarioActual();
  if (!user) {
    if (confirm('Necesitas iniciar sesión para reservar. ¿Ir a iniciar sesión?')) {
      window.location.href = 'login.html?next=' + encodeURIComponent(window.location.href);
    }
    return;
  }

  var btn = document.getElementById('bookBtn');
  btn.textContent = 'Reservando...';
  btn.disabled = true;

  var res = await crearReserva({
    professional_id: pro.id,
    service_date: date,
    service_time: time,
    address: addr,
    price: pro.price
  });

  if (res.error) {
    alert('Error: ' + res.error.message);
    btn.textContent = 'Reservar ahora';
    btn.disabled = false;
    return;
  }

  alert('✅ ¡Reserva confirmada!\n\n' + pro.service_name + '\n📅 ' + date + ' a las ' + time + '\n📍 ' + addr + '\n💲 $' + pro.price + ' MXN\n\nRevisa "Mis reservas".');
  window.location.href = 'mis-reservas.html';
}

loadProfile();
