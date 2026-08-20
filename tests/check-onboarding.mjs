// Check del ONBOARDING de bienvenida (Playwright Chromium).
// Verifica con ?onboarding=1 que aparece el overlay con 3 slides, dots y botones,
// que "Siguiente" avanza, que el último slide dice "Empezar" y cierra el overlay,
// y que no hay errores JS propios. Sirve el sitio en un puerto dinámico.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = join(process.cwd(), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
const PORT = 4900 + Math.floor(Math.random() * 300);

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

const results = [];
function rec(name, ok, detail){ results.push({name,ok}); console.log(`[${ok?'PASS':'FAIL'}] ${name}${detail?' — '+detail:''}`); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
pg.on('console', m => { if (m.type()==='error') {
  const t = m.text();
  if (!/Failed to load resource|net::ERR|supabase|401|400|favicon/i.test(t)) errors.push('console: ' + t);
}});

// Limpia localStorage y fuerza el onboarding
await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
await pg.evaluate(() => { try { localStorage.removeItem('manita_onboarding'); } catch(e){} });
await pg.goto(`http://localhost:${PORT}/index.html?onboarding=1`, { waitUntil: 'networkidle', timeout: 15000 });
await pg.waitForSelector('.onboarding', { timeout: 5000 }).catch(()=>{});
await pg.waitForTimeout(300);

const overlayVisible = await pg.isVisible('.onboarding');
const slides = await pg.$$eval('.ob-slide', els => els.length);
const dots = await pg.$$eval('.ob-dot', els => els.length);
const hasSkip = await pg.$('#obSkip') !== null;
const hasNext = await pg.$('#obNext') !== null;
rec('Onboarding: overlay con 3 slides + 3 dots + saltar + siguiente', overlayVisible && slides === 3 && dots === 3 && hasSkip && hasNext, `overlay=${overlayVisible} slides=${slides} dots=${dots} skip=${hasSkip} next=${hasNext}`);

const role = await pg.getAttribute('.onboarding', 'role');
const modal = await pg.getAttribute('.onboarding', 'aria-modal');
rec('Onboarding: accesible (role=dialog, aria-modal=true)', role === 'dialog' && modal === 'true', `role=${role} modal=${modal}`);

// Slide 1 activo
let activeIdx = await pg.$$eval('.ob-slide', els => els.findIndex(e => e.classList.contains('active')));
rec('Onboarding: arranca en el primer slide', activeIdx === 0, `activeIdx=${activeIdx}`);

// Avanzar con "Siguiente" hasta el último
await pg.click('#obNext');
await pg.waitForTimeout(200);
await pg.click('#obNext');
await pg.waitForTimeout(200);
activeIdx = await pg.$$eval('.ob-slide', els => els.findIndex(e => e.classList.contains('active')));
const nextLabel = await pg.textContent('#obNext');
rec('Onboarding: "Siguiente" avanza al slide 3 y el botón dice "Empezar"', activeIdx === 2 && /Empezar/i.test(nextLabel), `activeIdx=${activeIdx} label=${nextLabel}`);

// Cerrar con "Empezar"
await pg.click('#obNext');
await pg.waitForTimeout(500);
const overlayGone = (await pg.$('.onboarding')) === null;
const storageSet = await pg.evaluate(() => { try { return localStorage.getItem('manita_onboarding') === '1'; } catch(e){ return false; } });
rec('Onboarding: "Empezar" cierra el overlay y persiste en localStorage', overlayGone && storageSet, `gone=${overlayGone} stored=${storageSet}`);

// No debe reaparecer al recargar
await pg.goto(`http://localhost:${PORT}/index.html?app=1`, { waitUntil: 'networkidle', timeout: 15000 });
await pg.waitForTimeout(300);
const shownAgain = await pg.$('.onboarding') !== null;
rec('Onboarding: no reaparece tras completarlo', !shownAgain);

rec('Onboarding: sin errores JS propios', errors.length === 0, errors.slice(0,2).join(' | '));

await ctx.close();
await browser.close();
server.close();

const fail = results.filter(r=>!r.ok).length;
console.log(`\n===== CHECK ONBOARDING: ${results.length-fail} PASS · ${fail} FAIL =====`);
process.exit(fail>0?1:0);
