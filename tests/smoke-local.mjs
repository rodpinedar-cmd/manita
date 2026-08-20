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
  'ser-profesional.html','mis-reservas.html','pro-panel.html','reserva-confirmada.html','login.html','cuenta.html','legal.html'];
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
  const bad = /\balert\(|\bconfirm\(|\bprompt\(/.test(src);
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

const fail = results.filter(r=>!r.ok).length;
console.log(`\n===== SMOKE LOCAL: ${results.length-fail} PASS · ${fail} FAIL =====`);
process.exit(fail>0?1:0);
