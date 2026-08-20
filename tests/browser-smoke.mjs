// Smoke test de NAVEGADOR REAL (Chromium headless via Playwright).
// Sirve el sitio localmente y carga cada página, capturando errores de consola/página.
// Verifica que el header componentizado se monta (aunque Supabase falle, mountHeader debe pintar la barra).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = join(process.cwd(), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
const PORT = 4600 + Math.floor(Math.random() * 300); // puerto dinámico para evitar EADDRINUSE

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
  'ser-profesional.html','login.html','legal.html','perfil.html?id=x','mis-reservas.html','pro-panel.html','reserva-confirmada.html','cuenta.html'];

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
// ===== Verificación MODO APP (barra inferior tipo app nativa) =====
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const pg = await ctx.newPage();
  // ?app=1 fuerza el modo app para previsualizar sin instalar
  await pg.goto(`http://localhost:${PORT}/index.html?app=1`, { waitUntil: 'networkidle', timeout: 15000 });
  await pg.waitForTimeout(500);
  const navVisible = await pg.isVisible('.bottom-nav');
  const tabs = await pg.$$eval('.bn-item', els => els.length);
  const activeTab = await pg.$$eval('.bn-item.active .bn-label', els => els[0] ? els[0].textContent : '');
  const bodyAppMode = await pg.evaluate(() => document.body.classList.contains('app-mode'));
  rec('Modo app: barra inferior visible con 5 pestañas', navVisible && tabs === 5, `nav=${navVisible} tabs=${tabs}`);
  rec('Modo app: pestaña Buscar activa + body.app-mode', activeTab === 'Buscar' && bodyAppMode, `active=${activeTab} appMode=${bodyAppMode}`);
  // Home tipo app: appHome visible, hero de landing oculto, círculos de categorías presentes
  const appHomeVisible = await pg.evaluate(() => { const h = document.getElementById('appHome'); return h && h.style.display !== 'none'; });
  const heroHidden = await pg.evaluate(() => { const h = document.querySelector('section.hero'); return h && h.style.display === 'none'; });
  const cards = await pg.$$eval('.ah-cat', els => els.length);
  const brand = await pg.$$eval('.ah-brand', els => els.length);
  const searchbar = await pg.$$eval('.ah-searchbar', els => els.length);
  rec('Modo app: home rediseñado (buscador + grid categorías + marca) reemplaza landing', appHomeVisible && heroHidden && cards >= 7 && brand === 1 && searchbar === 1, `home=${appHomeVisible} heroHidden=${heroHidden} cards=${cards} search=${searchbar}`);
  await ctx.close();
}

// ===== Verificación PWA =====
{
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle', timeout: 15000 });

  // Manifest enlazado y descargable con campos requeridos
  const manifestHref = await pg.getAttribute('link[rel="manifest"]', 'href');
  rec('PWA: manifest enlazado en index', manifestHref === 'manifest.json');
  const mres = await pg.evaluate(async () => {
    const r = await fetch('manifest.json'); const j = await r.json();
    return { name: j.name, display: j.display, icons: (j.icons||[]).length, start: j.start_url, theme: j.theme_color };
  });
  rec('PWA: manifest válido (name/display/icons/start_url/theme)',
    !!mres.name && mres.display === 'standalone' && mres.icons >= 1 && !!mres.start && !!mres.theme,
    JSON.stringify(mres));

  // Service worker se registra
  const swReg = await pg.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no-sw-api';
    try { const r = await navigator.serviceWorker.ready; return r ? 'registered' : 'no-reg'; }
    catch(e){ return 'err:' + e.message; }
  });
  rec('PWA: service worker registrado', swReg === 'registered', swReg);

  // theme-color meta presente
  const theme = await pg.getAttribute('meta[name="theme-color"]', 'content');
  rec('PWA: theme-color presente', theme === '#FF6B4A', theme);

  await ctx.close();
}

// ===== Verificación botones de descarga + QR (index) =====
{
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await pg.waitForTimeout(400);
  // Botón de descarga de APK presente (por texto; el href se degrada a # si el APK aún no existe)
  const hasDownload = await pg.$$eval('a.btn', els => els.some(e => /Descargar app/i.test(e.textContent)));
  rec('Descarga: botón "Descargar app (Android)" presente', hasDownload);
  // QR lateral de la sección app
  const qrSide = await pg.$$eval('.app-qr-side img', els => els.length > 0 && els[0].getAttribute('src').includes('qrserver'));
  rec('Descarga: QR lateral apunta a generador de QR', qrSide);
  // Abrir modal QR y verificar que el QR se genera dinámicamente
  await pg.evaluate(() => openQR());
  await pg.waitForTimeout(600);
  await pg.waitForFunction(() => { const i = document.getElementById('qrImg'); return i && i.src && i.src.indexOf('qrserver') !== -1; }, { timeout: 5000 }).catch(()=>{});
  const modalOpen = await pg.evaluate(() => document.getElementById('qrModal').classList.contains('open'));
  const qrGenerated = await pg.evaluate(() => { const i = document.getElementById('qrImg'); return !!(i && i.src && i.src.indexOf('qrserver') !== -1); });
  const hasInstallBtn = await pg.$('#modalInstallBtn') !== null;
  rec('Descarga: modal abre + QR generado + botón instalar', modalOpen && qrGenerated && hasInstallBtn, `open=${modalOpen} qr=${qrGenerated} btn=${hasInstallBtn}`);
  // Tabs Android / iPhone
  await pg.evaluate(() => dlTab('ios'));
  await pg.waitForTimeout(200);
  const iosVisible = await pg.evaluate(() => document.getElementById('paneIos').style.display !== 'none' && document.getElementById('paneAndroid').style.display === 'none');
  const iosSteps = await pg.$$eval('.ios-steps li', els => els.length);
  rec('Descarga: pestaña iPhone muestra pasos de Safari', iosVisible && iosSteps >= 4, `iosVisible=${iosVisible} steps=${iosSteps}`);
  await pg.evaluate(() => dlTab('android'));
  const androidBack = await pg.evaluate(() => document.getElementById('paneAndroid').style.display !== 'none');
  rec('Descarga: pestaña Android vuelve a mostrarse', androidBack);
  await ctx.close();
}

// ===== Verificación menú móvil (M089/M090) =====
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); // iPhone-ish
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await pg.waitForTimeout(400);
  // El hamburguesa debe estar visible en móvil
  const burgerVisible = await pg.isVisible('#hdrHamburger');
  rec('Móvil: hamburguesa visible', burgerVisible);
  if (burgerVisible) {
    await pg.click('#hdrHamburger');
    await pg.waitForTimeout(350);
    const expanded = await pg.getAttribute('#hdrHamburger', 'aria-expanded');
    const menuOpen = await pg.evaluate(() => document.getElementById('hdrActions').classList.contains('open'));
    rec('Móvil: menú se despliega + aria-expanded=true', expanded === 'true' && menuOpen);
  }
  await ctx.close();
}

// ===== Verificación banner iOS "instálame desde Safari" =====
{
  const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, userAgent: iosUA });
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}/index.html?ioshint=1`, { waitUntil: 'networkidle', timeout: 15000 });
  await pg.waitForSelector('#iosHint', { timeout: 5000 }).catch(()=>{});
  const hintVisible = await pg.isVisible('#iosHint');
  const hasClose = await pg.$('#iosHintClose') !== null;
  rec('iOS: banner "instálame desde Safari" aparece en iPhone Safari', hintVisible && hasClose, `visible=${hintVisible} close=${hasClose}`);
  if (hintVisible) {
    await pg.click('#iosHintClose');
    await pg.waitForTimeout(200);
    const gone = await pg.$('#iosHint') === null;
    const stored = await pg.evaluate(() => { try { return localStorage.getItem('manita_ios_hint') === '1'; } catch(e){ return false; } });
    rec('iOS: cerrar el banner lo oculta y lo recuerda', gone && stored, `gone=${gone} stored=${stored}`);
  }
  await ctx.close();
}
// El banner NO debe aparecer en Android/desktop (sin UA de iPhone)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}/index.html?ioshint=1`, { waitUntil: 'networkidle', timeout: 15000 });
  await pg.waitForTimeout(400);
  const hint = await pg.$('#iosHint');
  rec('iOS: banner NO aparece fuera de iPhone', hint === null);
  await ctx.close();
}

await browser.close();
server.close();

const fail = results.filter(r=>!r.ok).length;
console.log(`\n===== BROWSER SMOKE: ${results.length-fail} PASS · ${fail} FAIL =====`);
process.exit(fail>0?1:0);
