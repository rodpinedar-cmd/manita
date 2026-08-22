// ===== MANITA — Panel de administración (verificaciones) =====
mountHeader({ search: false });

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function toast(msg, kind){ var t=document.createElement('div'); t.className='toast toast-'+(kind||'info'); t.setAttribute('role','status'); t.textContent=msg; document.body.appendChild(t); requestAnimationFrame(function(){t.classList.add('show');}); setTimeout(function(){t.classList.remove('show'); setTimeout(function(){t.remove();},300);},3200); }

var filtro = 'pending';

async function init(){
  var user = await usuarioActual();
  var gate = document.getElementById('admGate');
  if (!user){ window.location.href = 'login.html?next=' + encodeURIComponent('admin.html'); return; }
  var admin = await esAdmin();
  if (!admin){
    gate.innerHTML = '<div class="state-empty" style="text-align:center;padding:48px 20px;">' +
      '<div style="font-size:48px;margin-bottom:12px;">🔒</div>' +
      '<h2 style="color:var(--navy);margin-bottom:8px;">Acceso restringido</h2>' +
      '<p style="color:var(--gray);">Esta sección es solo para administradores de Manita.</p>' +
      '<a class="btn btn-primary" href="index.html" style="margin-top:16px;">Ir al inicio</a></div>';
    return;
  }
  gate.style.display = 'none';
  document.getElementById('admContent').style.display = 'block';

  document.querySelectorAll('.adm-tab').forEach(function(t){
    t.onclick = function(){
      document.querySelectorAll('.adm-tab').forEach(function(x){ x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      filtro = t.getAttribute('data-f');
      cargar();
    };
  });
  cargar();
}

async function cargar(){
  var list = document.getElementById('vrList');
  list.innerHTML = '<div class="skeleton skeleton-card"></div>';
  var res = await listarVerificaciones(filtro);
  if (res.error){ list.innerHTML = '<div class="state-error" role="alert">No se pudieron cargar las solicitudes. <button class="btn btn-ghost" onclick="cargar()">Reintentar</button></div>'; return; }
  if (!res.data.length){
    var txt = filtro === 'pending' ? 'No hay solicitudes pendientes.' : filtro === 'approved' ? 'Aún no hay verificaciones aprobadas.' : 'No hay solicitudes rechazadas.';
    list.innerHTML = '<div class="state-empty" style="padding:32px;text-align:center;color:var(--gray);">' + txt + '</div>';
    return;
  }
  list.innerHTML = res.data.map(function(v){
    var pro = v.professionals || {};
    var stClass = v.status === 'approved' ? 'st-approved' : v.status === 'rejected' ? 'st-rejected' : 'st-pending';
    var stTxt = v.status === 'approved' ? 'Aprobada' : v.status === 'rejected' ? 'Rechazada' : 'Pendiente';
    var fecha = new Date(v.created_at).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });
    var acciones = '';
    if (v.status === 'pending'){
      acciones = '<div class="vr-actions">' +
        '<button class="btn btn-ghost" data-doc="' + esc(v.doc_path) + '">Ver documento</button>' +
        '<button class="btn btn-primary" data-ok="' + v.id + '">Aprobar</button>' +
        '<button class="btn btn-ghost" data-no="' + v.id + '" style="color:var(--danger);">Rechazar</button>' +
      '</div>';
    } else {
      acciones = '<div class="vr-actions"><button class="btn btn-ghost" data-doc="' + esc(v.doc_path) + '">Ver documento</button></div>' +
        (v.note ? '<p style="font-size:13px;color:var(--gray);margin-top:8px;">Nota: ' + esc(v.note) + '</p>' : '');
    }
    return '<div class="vr-card">' +
      '<div class="vr-head"><div>' +
        '<div class="vr-title">' + esc(pro.service_name || 'Profesional') + '</div>' +
        '<div class="vr-meta">📍 ' + esc(pro.zone || 'CDMX') + ' · Solicitado el ' + fecha + '</div>' +
      '</div><span class="vr-status ' + stClass + '">' + stTxt + '</span></div>' +
      acciones + '</div>';
  }).join('');

  // Ver documento (URL firmada temporal)
  list.querySelectorAll('[data-doc]').forEach(function(b){
    b.onclick = async function(){
      var r = await urlDocumentoVerificacion(b.getAttribute('data-doc'));
      if (r.error || !r.url){ toast('No se pudo abrir el documento.', 'error'); return; }
      window.open(r.url, '_blank', 'noopener');
    };
  });
  // Aprobar
  list.querySelectorAll('[data-ok]').forEach(function(b){
    b.onclick = async function(){
      b.disabled = true; b.textContent = 'Aprobando...';
      var r = await aprobarVerificacion(b.getAttribute('data-ok'));
      if (r.error){ toast('No se pudo aprobar: ' + r.error.message, 'error'); b.disabled=false; b.textContent='Aprobar'; return; }
      toast('Profesional verificado ✔️', 'success'); cargar();
    };
  });
  // Rechazar (pide motivo con un modal propio)
  list.querySelectorAll('[data-no]').forEach(function(b){
    b.onclick = function(){ abrirRechazo(b.getAttribute('data-no')); };
  });
}

function abrirRechazo(id){
  var ov = document.createElement('div');
  ov.className = 'modal-overlay open';
  ov.innerHTML =
    '<div class="modal-box" role="dialog" aria-modal="true" aria-label="Rechazar verificación">' +
      '<h3>Rechazar verificación</h3>' +
      '<p style="color:var(--gray);font-size:14px;margin:10px 0;">Indica el motivo (el profesional lo verá y podrá reintentar).</p>' +
      '<input type="text" id="rejMotivo" placeholder="Ej. La foto está borrosa" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;box-sizing:border-box;">' +
      '<button type="button" class="btn btn-primary btn-lg" id="rejOk" style="width:100%;margin-top:12px;background:var(--danger);">Rechazar</button>' +
      '<button type="button" class="btn btn-ghost" id="rejCancel" style="width:100%;margin-top:8px;">Cancelar</button>' +
    '</div>';
  document.body.appendChild(ov);
  ov.querySelector('#rejCancel').onclick = function(){ ov.remove(); };
  ov.querySelector('#rejOk').onclick = async function(){
    var motivo = ov.querySelector('#rejMotivo').value.trim();
    if (motivo.length < 3){ toast('Escribe un motivo breve.', 'error'); return; }
    this.disabled = true; this.textContent = 'Rechazando...';
    var r = await rechazarVerificacion(id, motivo);
    ov.remove();
    if (r.error){ toast('No se pudo rechazar.', 'error'); return; }
    toast('Solicitud rechazada.', 'info'); cargar();
  };
}

init();
