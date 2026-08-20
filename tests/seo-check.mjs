// Valida metadatos SEO: description, canonical, Open Graph, Twitter, JSON-LD, sitemap, robots.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const ROOT = join(process.cwd(), '..');
const results = [];
function rec(n, ok, d){ results.push({n,ok}); console.log(`[${ok?'PASS':'FAIL'}] ${n}${d?' — '+d:''}`); }

const PAGES = ['index.html','servicios.html','categorias.html','como-funciona.html','ser-profesional.html'];
for (const p of PAGES) {
  const html = await readFile(join(ROOT, p), 'utf8');
  const hasDesc = /<meta name="description" content="[^"]{30,}"/.test(html);
  const hasCanonical = /<link rel="canonical"/.test(html);
  const hasOG = html.includes('og:title') && html.includes('og:image') && html.includes('og:url');
  const hasTwitter = html.includes('twitter:card');
  rec(`${p}: description + canonical + OG + Twitter`, hasDesc && hasCanonical && hasOG && hasTwitter, `desc=${hasDesc} canon=${hasCanonical} og=${hasOG} tw=${hasTwitter}`);
}

// JSON-LD válido en index
{
  const html = await readFile(join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let ok = false, detail = 'no encontrado';
  if (m) { try { const j = JSON.parse(m[1]); ok = j['@type']==='Organization' && !!j.name; detail = j['@type']; } catch(e){ detail = 'JSON inválido: '+e.message; } }
  rec('index: JSON-LD Organization válido', ok, detail);
}

// sitemap.xml y robots.txt
{
  const sm = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
  rec('sitemap.xml válido con URLs', sm.includes('<urlset') && (sm.match(/<loc>/g)||[]).length >= 5, (sm.match(/<loc>/g)||[]).length+' urls');
  const rb = await readFile(join(ROOT, 'robots.txt'), 'utf8');
  rec('robots.txt con Sitemap y Disallow de privadas', rb.includes('Sitemap:') && rb.includes('Disallow: /cuenta.html'));
}

const fail = results.filter(r=>!r.ok).length;
console.log(`\n===== SEO: ${results.length-fail} PASS · ${fail} FAIL =====`);
process.exit(fail>0?1:0);
