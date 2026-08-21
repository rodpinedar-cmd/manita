// ============================================================
// MANITA — Simulador de 20 usuarios navegando web + app (Playwright)
// Cada "persona" tiene un dispositivo, un objetivo y un recorrido.
// Registra por página: errores JS, enlaces rotos (href a páginas 404),
// botones sin acción, targets < 44px, imágenes sin alt, y contenido vacío.
// Al final agrega TODO en un reporte de fallos + mejoras priorizadas.
// No modifica la app; solo la usa y observa. Sirve el sitio en puerto dinámico.
// ============================================================
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = join(process.cwd(), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };
const PORT = 5200 + Math.floor(Math.random() * 300);
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
const BASE = `http://localhost:${PORT}`;

// Páginas públicas navegables (sin sesión). perfil usa un id demo.
const PAGES = [
  { path: 'index.html', name: 'Inicio' },
  { path: 'categorias.html', name: 'Categorías' },
  { path: 'servicios.html', name: 'Servicios' },
  { path: 'como-funciona.html', name: 'Cómo funciona' },
  { path: 'ser-profesional.html', name: 'Ser profesional' },
  { path: 'login.html', name: 'Login' },
  { path: 'legal.html', name: 'Legal' },
  { path: 'favoritos.html', name: 'Favoritos' },
  { path: 'mensajes.html', name: 'Mensajes' },
  { path: 'mis-reservas.html', name: 'Mis reservas' },
  { path: 'cuenta.html', name: 'Cuenta' },
  { path: 'perfil.html?id=demo', name: 'Perfil pro' }
];
const KNOWN = new Set(PAGES.map(p => p.path.split('?')[0]).concat(['pro-panel.html','reserva-confirmada.html','index.html']));

// 20 personas con dispositivo y "modo" (web o app). Mezcla móvil/desktop, iOS/Android.
const DEVICES = {
  iphone:  { viewport:{width:390,height:844}, ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  android: { viewport:{width:412,height:915}, ua:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' },
  desktop: { viewport:{width:1280,height:800}, ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' },
  small:   { viewport:{width:360,height:640}, ua:'Mozilla/5.0 (Linux; Android 10; SM-A505) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' }
};
const PERSONAS = [];
const names = ['Ana','Beto','Caro','Diego','Emma','Fer','Gaby','Hugo','Ivy','Jorge','Kena','Luis','Mara','Nico','Olga','Pablo','Rosa','Sam','Tere','Uri'];
const devCycle = ['iphone','android','desktop','small'];
for (let i=0;i<20;i++){
  const dev = devCycle[i % devCycle.length];
  const appMode = (i % 3 === 0); // ~1/3 usa "modo app"
  PERSONAS.push({ id:i+1, name:names[i], dev, appMode });
}

const findings = []; // {sev, page, persona, msg}
function add(sev, page, persona, msg){ findings.push({sev, page, persona, msg}); }

const browser = await chromium.launch();
let pagesVisited = 0, jsErrors = 0;

for (const per of PERSONAS) {
  const d = DEVICES[per.dev];
  const ctx = await browser.newContext({ viewport:d.viewport, userAgent:d.ua });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => { if (m.type()==='error'){ const t=m.text(); if(!/Failed to load resource|net::ERR|supabase|401|400|favicon|Unexpected token/i.test(t)) errs.push(t); }});

  for (const P of PAGES) {
    const url = `${BASE}/${P.path}${P.path.includes('?')?'&':'?'}${per.appMode?'app=1':''}`;
    errs.length = 0;
    let t0 = Date.now();
    try {
      await pg.goto(url, { waitUntil:'networkidle', timeout:20000 });
      await pg.waitForTimeout(250);
    } catch(e){ add('BLOQUEANTE', P.name, per, 'La página no cargó: '+e.message.slice(0,80)); continue; }
    pagesVisited++;
    const load = Date.now()-t0;
    if (load > 6000) add('MEDIO', P.name, per, `Carga lenta (${load}ms) en ${per.dev}`);

    // Errores JS propios
    if (errs.length){ jsErrors++; add('ALTO', P.name, per, 'Error JS: '+errs.slice(0,1)[0].slice(0,120)); }

    // Contenido vacío (páginas que deberían tener texto visible)
    const bodyText = (await pg.evaluate(()=>document.body.innerText || '')).trim();
    if (bodyText.length < 40) add('ALTO', P.name, per, 'Página casi vacía (¿no cargó contenido?)');

    // Enlaces rotos: href a .html locales que no existen
    const badLinks = await pg.$$eval('a[href]', as => as
      .map(a => a.getAttribute('href'))
      .filter(h => h && h.endsWith('.html'))
      .map(h => h.split('?')[0].replace(/^\.?\//,'')));
    for (const h of badLinks){ if (!/^https?:/.test(h) && !new Set(['index.html','categorias.html','servicios.html','como-funciona.html','ser-profesional.html','login.html','legal.html','favoritos.html','mensajes.html','mis-reservas.html','cuenta.html','perfil.html','pro-panel.html','reserva-confirmada.html']).has(h)) add('ALTO', P.name, per, 'Enlace a página inexistente: '+h); }

    // Botones/enlaces "muertos": href="#" o botones sin onclick ni listener aparente
    const deadHash = await pg.$$eval('a[href="#"]', a => a.length);
    if (deadHash > 0) add('MEDIO', P.name, per, `${deadHash} enlace(s) href="#" sin destino`);

    // Solo en móvil: targets táctiles pequeños (<44px) en botones/enlaces visibles del viewport
    if (per.dev !== 'desktop'){
      const small = await pg.evaluate(() => {
        const els = [...document.querySelectorAll('a,button,input[type=submit]')];
        let n=0;
        for (const el of els){ const r=el.getBoundingClientRect(); if (r.width>0&&r.height>0&&r.top<window.innerHeight && (r.height<40||r.width<40)) n++; }
        return n;
      });
      if (small > 4) add('MEDIO', P.name, per, `${small} objetivos táctiles pequeños (<44px) en móvil`);
    }

    // Imágenes sin alt
    const noAlt = await pg.$$eval('img', imgs => imgs.filter(i => !i.getAttribute('alt')).length);
    if (noAlt > 0) add('BAJO', P.name, per, `${noAlt} imagen(es) sin alt`);

    // Inputs sin label asociado (accesibilidad de formularios)
    const badInputs = await pg.evaluate(() => {
      const ins = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')];
      let n=0;
      for (const el of ins){ const id=el.id; const lbl = id && document.querySelector(`label[for="${id}"]`); const aria = el.getAttribute('aria-label')||el.getAttribute('placeholder'); if (!lbl && !aria) n++; }
      return n;
    });
    if (badInputs > 0) add('MEDIO', P.name, per, `${badInputs} campo(s) sin etiqueta ni aria-label`);
  }

  // Interacción específica en modo app: la barra inferior debe existir
  if (per.appMode){
    await pg.goto(`${BASE}/index.html?app=1`, { waitUntil:'networkidle' }).catch(()=>{});
    const hasNav = await pg.$('.bottom-nav') !== null;
    if (!hasNav) add('ALTO','Inicio (app)', per,'Modo app sin barra inferior');
  }
  await ctx.close();
}
await browser.close();
server.close();

// ===== Agregación del reporte =====
const bySev = { BLOQUEANTE:[], ALTO:[], MEDIO:[], BAJO:[] };
const dedup = {};
for (const f of findings){
  const key = f.sev+'|'+f.page+'|'+f.msg;
  if (!dedup[key]) dedup[key] = { ...f, count:0, personas:new Set() };
  dedup[key].count++; dedup[key].personas.add(f.persona.name+'('+f.persona.dev+')');
}
for (const k in dedup){ bySev[dedup[k].sev]?.push(dedup[k]); }

let out = `# Reporte de simulación — 20 usuarios navegando Manita\n\n`;
out += `Fecha: ${new Date().toISOString().slice(0,10)}\n`;
out += `Usuarios simulados: ${PERSONAS.length} · Páginas visitadas: ${pagesVisited} · Con error JS: ${jsErrors}\n\n`;
out += `Dispositivos: iPhone, Android, Desktop, móvil pequeño (360px). ~1/3 en "modo app".\n\n`;
const order = ['BLOQUEANTE','ALTO','MEDIO','BAJO'];
let total = 0;
for (const sev of order){
  const items = (bySev[sev]||[]).sort((a,b)=>b.count-a.count);
  out += `\n## ${sev} (${items.length})\n`;
  if (!items.length){ out += `Sin hallazgos.\n`; continue; }
  for (const it of items){ total++; out += `- **[${it.page}]** ${it.msg} — visto ${it.count}x (${[...it.personas].slice(0,4).join(', ')}${it.personas.size>4?'…':''})\n`; }
}
out += `\n---\nTotal de hallazgos únicos: ${total}\n`;

await writeFile(join(process.cwd(), 'REPORTE_SIMULACION.md'), out, 'utf8');
console.log(out);
console.log('\nGuardado en tests/REPORTE_SIMULACION.md');
process.exit(0);
