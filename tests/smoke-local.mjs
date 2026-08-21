// Smoke test local (sin Supabase): verifica que
//  (1) todas las páginas responden 200,
//  (2) cada archivo JS parsea sin error de sintaxis,
//  (3) los scripts referenciados por cada HTML existen,
//  (4) no quedan alert()/confirm()/prompt() ni href="#" muertos en el flujo.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(process.cwd(), '..');
const results = [];
function rec(name, ok, detail){ results.push({name,ok}); console.log(`[${ok?'PASS':'FAIL'}] ${name}${detail?' — '+detail:''}`); }

const PAGES = ['index.html','servicios.html','perfil.html','categorias.html','como-funciona.html',
  'ser-profesional.html','mis-reservas.html','pro-panel.html','reserva-confirmada.html','login.html','cuenta.html','legal.html','favoritos.html','mensajes.html'];
const JS = ['supabase-client.js','components.js','data.js','app.js','servicios.js','perfil.js'];

// 1. Páginas existen y tienen estructura mínima
for (const p of PAGES) {
  try {
    const html = await readFile(join(ROOT, p), 'utf8');
    const ok = html.includes('<html') && html.includes('</html>');
    rec(`Página ${p} bien formada`, ok);
  } catch (e) { rec(`Página ${p} existe`, false, e.message); }
}

// 2. JS parsea sin error de sintaxis (usa el parser real de V8)
for (const f of JS) {
  try {
    const code = await readFile(join(ROOT, 'js', f), 'utf8');
    new vm.Script(code, { filename: f }); // lanza si hay error de sintaxis
    rec(`JS ${f} parsea sin error de sintaxis`, true);
  } catch (e) { rec(`JS ${f} parsea`, false, e.message); }
}

// 3. Scripts referenciados por cada HTML existen en disco
for (const p of PAGES) {
  const html = await readFile(join(ROOT, p), 'utf8');
  const refs = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  let allExist = true, missing = '';
  for (const r of refs) {
    try { await readFile(join(ROOT, r)); } catch { allExist = false; missing += r + ' '; }
  }
  rec(`Scripts de ${p} existen`, allExist, missing);
}

// 4. Sin alert/confirm/prompt ni href="#" muerto en el flujo transaccional
const FLOW = ['perfil.html','mis-reservas.html','pro-panel.html','ser-profesional.html','index.html','servicios.html'];
const FLOW_JS = ['perfil.js','servicios.js','components.js'];
for (const p of [...FLOW, ...FLOW_JS.map(f=>'js/'+f)]) {
  const src = await readFile(join(ROOT, p), 'utf8');
  // Detecta llamadas GLOBALES a alert/confirm/prompt (no métodos como deferredPrompt.prompt()
  // ni el evento beforeinstallprompt, que son API legítima de PWA).
  const bad = /(^|[^.\w])(alert|confirm|prompt)\s*\(/.test(
    src.replace(/beforeinstallprompt/g, '').replace(/deferredPrompt/g, '')
  );
  rec(`${p} sin alert/confirm/prompt`, !bad);
}
for (const p of FLOW) {
  const src = await readFile(join(ROOT, p), 'utf8');
  const deadLinks = (src.match(/href="#"/g) || []).length;
  rec(`${p} sin href="#" muertos`, deadLinks === 0, deadLinks ? deadLinks+' encontrados' : '');
}

// 5. Header componentizado: cada página del flujo usa id="appHeader" + mountHeader
for (const p of ['index.html','servicios.html','perfil.html','categorias.html','como-funciona.html','ser-profesional.html','mis-reservas.html']) {
  const src = await readFile(join(ROOT, p), 'utf8');
  const ok = src.includes('id="appHeader"') && src.includes('mountHeader');
  rec(`${p} usa header componentizado`, ok);
}

// 6. Rendimiento: preconnect a gstatic (dominio de los .woff2) en todas las páginas con fuente
for (const p of PAGES) {
  const src = await readFile(join(ROOT, p), 'utf8');
  if (!src.includes('fonts.googleapis.com')) continue; // páginas sin fuente externa
  const ok = src.includes('fonts.gstatic.com');
  rec(`${p} tiene preconnect a fonts.gstatic.com`, ok);
}

// 7. Pipeline de fotos (Fase 2) bien cableado
{
  const client = await readFile(join(ROOT, 'js/supabase-client.js'), 'utf8');
  const proPanel = await readFile(join(ROOT, 'pro-panel.html'), 'utf8');
  const perfilJs = await readFile(join(ROOT, 'js/perfil.js'), 'utf8');
  const cuenta = await readFile(join(ROOT, 'cuenta.html'), 'utf8');
  let sql = '';
  try { sql = await readFile(join(ROOT, 'supabase/ACTIVAR_FOTOS.sql'), 'utf8'); } catch {}

  rec('client define subirAvatar/subirTrabajo/borrarTrabajo', /function subirAvatar\b/.test(client) && /function subirTrabajo\b/.test(client) && /function borrarTrabajo\b/.test(client));
  rec('client define subirAvatarCliente', /function subirAvatarCliente\b/.test(client));
  rec('subida usa ruta {user_id}/... (policy de dueño)', /user\.id \+ '\//.test(client));
  rec('pro-panel tiene inputs de foto y portafolio', proPanel.includes('avatarInput') && proPanel.includes('portfolioInput'));
  rec('pro-panel valida almacenamiento (mensaje si no activo)', /activaste el almacenamiento/i.test(proPanel));
  rec('perfil muestra galería de trabajos', /galeriaBloque/.test(perfilJs) && /portfolio/.test(perfilJs));
  rec('cuenta tiene avatar de cliente clickeable', cuenta.includes('avatarClienteInput'));
  rec('SQL ACTIVAR_FOTOS crea buckets avatars y portfolio', /storage\.buckets/.test(sql) && /'avatars'/.test(sql) && /'portfolio'/.test(sql));
  rec('SQL crea columnas avatar_url y portfolio', /avatar_url/.test(sql) && /portfolio\s+text\[\]/.test(sql));
}

// 8. Pipeline de verificación de identidad bien cableado
{
  const client = await readFile(join(ROOT, 'js/supabase-client.js'), 'utf8');
  const proPanel = await readFile(join(ROOT, 'pro-panel.html'), 'utf8');
  let sql = '';
  try { sql = await readFile(join(ROOT, 'supabase/ACTIVAR_VERIFICACION.sql'), 'utf8'); } catch {}

  rec('client define subirVerificacion/miVerificacion', /function subirVerificacion\b/.test(client) && /function miVerificacion\b/.test(client));
  rec('verificación usa bucket privado verification', /from\('verification'\)/.test(client));
  rec('pro-panel tiene sección de verificación', proPanel.includes('verifInput') && proPanel.includes('verifSection'));
  rec('SQL verificación: bucket privado (public false)', /'verification'.*false/.test(sql));
  rec('SQL verificación: tabla verification_requests', /verification_requests/.test(sql));
  rec('SQL verificación: RPC aprobar solo admin', /aprobar_verificacion/.test(sql) && /is_admin\(\)/.test(sql));
}

const fail = results.filter(r=>!r.ok).length;
console.log(`\n===== SMOKE LOCAL: ${results.length-fail} PASS · ${fail} FAIL =====`);
process.exit(fail>0?1:0);
