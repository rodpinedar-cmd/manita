// Smoke test de NAVEGADOR REAL (Chromium headless via Playwright).
// Sirve el sitio localmente y carga cada página, capturando errores de consola/página.
// Verifica que el header componentizado se monta (aunque Supabase falle, mountHeader debe pintar la barra).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = join(process.cwd(), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
const PORT = 4611;

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r => server.listen(PORT, r));

const PAGES = ['index.html','servicios.html','categorias.html','como-funciona.html',
  'ser-profesional.html','login.html','legal.html','perfil.html?id=x','mis-reservas.html','pro-panel.html','reserva-confirmada.html'];

const results = [];
function rec(name, ok, detail){ results.push({name,ok}); console.log(`[${ok?'PASS':'FAIL'}] ${name}${detail?' — '+detail:''}`); }

const browser = await chromium.launch();
for (const page of PAGES) {
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  const errors = [];
  // Ignoramos errores de red hacia Supabase (esperados sin backend aplicado); capturamos errores de JS del propio código.
  pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type()==='error') {
    const t = m.text();
    // Filtra fallos de red esperados (fetch a supabase, favicon)
    if (!/Failed to load resource|net::ERR|supabase|401|400|Unexpected token 'A'|favicon/i.test(t)) errors.push('console: ' + t);
  }});
  try {
    await pg.goto(`http://localhost:${PORT}/${page}`, { waitUntil: 'networkidle', timeout: 15000 });
    await pg.waitForTimeout(500);
    // ¿Se montó el header? (barra con logo Manita) — solo en páginas con appHeader
    const html = await pg.content();
    const hasLogo = html.includes('logo-text');
    rec(`${page} carga sin errores JS propios`, errors.length === 0, errors.slice(0,2).join(' | '));
    if (['index.html','servicios.html','categorias.html','como-funciona.html','ser-profesional.html','mis-reservas.html','legal.html','perfil.html?id=x'].includes(page)) {
      rec(`${page} monta el header (logo visible)`, hasLogo);
    }
  } catch (e) {
    rec(`${page} carga`, false, e.message);
  }
  await ctx.close();
}
await browser.close();
server.close();

const fail = results.filter(r=>!r.ok).length;
console.log(`\n===== BROWSER SMOKE: ${results.length-fail} PASS · ${fail} FAIL =====`);
process.exit(fail>0?1:0);
