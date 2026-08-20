// Auditoría de accesibilidad real con axe-core sobre páginas clave.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = join(process.cwd(), '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json' };
const PORT = 4820 + Math.floor(Math.random()*150);
const server = createServer(async (req,res)=>{ try{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html'; const d=await readFile(join(ROOT,p)); res.writeHead(200,{'Content-Type':MIME[extname(p)]||'application/octet-stream'}); res.end(d);}catch{res.writeHead(404);res.end('404');}});
await new Promise(r=>server.listen(PORT,r));

const AXE = await (await fetch('https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js')).text();
const PAGES = ['index.html','categorias.html','servicios.html?cat=all','como-funciona.html','ser-profesional.html','login.html','legal.html'];
const b = await chromium.launch();
let totalCritical = 0;
for (const page of PAGES) {
  const pg = await (await b.newContext({ viewport:{ width:390, height:844 } })).newPage();
  await pg.goto(`http://localhost:${PORT}/${page}`, { waitUntil:'networkidle', timeout:15000 });
  await pg.waitForTimeout(400);
  await pg.addScriptTag({ content: AXE });
  const r = await pg.evaluate(async () => await window.axe.run(document, { runOnly:['wcag2a','wcag2aa'] }));
  const serious = r.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  totalCritical += serious.length;
  console.log(`\n[${page}] violaciones serias/críticas: ${serious.length}`);
  serious.forEach(v => {
    console.log(`  - ${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`);
    // Muestra los primeros 3 nodos con su detalle de contraste
    v.nodes.slice(0,3).forEach(n => {
      var data = n.any && n.any[0] && n.any[0].data;
      console.log('      target:', n.target.join(' '), data ? ('fg='+data.fgColor+' bg='+data.bgColor+' ratio='+data.contrastRatio) : '');
    });
  });
  await pg.context().close();
}
await b.close(); server.close();
console.log(`\n===== TOTAL serias/críticas: ${totalCritical} =====`);
process.exit(0);
