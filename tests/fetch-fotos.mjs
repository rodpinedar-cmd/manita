// Descarga fotos libres (Unsplash, licencia de uso libre incl. comercial) para la
// presentación de lanzamiento. Se guardan en capturas/fotos/. Idempotente.
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'capturas', 'fotos');
await mkdir(DIR, { recursive: true });

// URLs directas de Unsplash (parámetros de recorte para peso razonable).
// Cada foto ilustra una categoría de servicio de Manita.
const FOTOS = {
  'limpieza.jpg':   'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&h=600&fit=crop&q=80',
  'plomeria.jpg':   'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=900&h=600&fit=crop&q=80',
  'electricista.jpg':'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=900&h=600&fit=crop&q=80',
  'piano.jpg':      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=900&h=600&fit=crop&q=80',
  'patinaje.jpg':   'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=900&h=600&fit=crop&q=80',
  'rollers.jpg':    'https://images.unsplash.com/photo-1621544402532-78c290378588?w=900&h=600&fit=crop&q=80',
  'rollers2.jpg':   'https://images.unsplash.com/photo-1595429035839-c99c298ffdde?w=900&h=600&fit=crop&q=80',
  'jardineria.jpg': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&h=600&fit=crop&q=80',
  'fisioterapia.jpg':'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&h=600&fit=crop&q=80',
  'guitarra.jpg':   'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=900&h=600&fit=crop&q=80',
  'app-mano.jpg':   'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1400&h=800&fit=crop&q=80',
  'mascotas.jpg':   'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=900&h=600&fit=crop&q=80',
  'belleza.jpg':    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&h=600&fit=crop&q=80',
  'ninos.jpg':      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=900&h=600&fit=crop&q=80',
  'trainer.jpg':    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&h=600&fit=crop&q=80',
  'handyman.jpg':   'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=900&h=600&fit=crop&q=80',
  'hero-familia.jpg':'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1400&h=800&fit=crop&q=80',
  'cliente-feliz.jpg':'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&h=600&fit=crop&q=80',
  'ciudad-cdmx.jpg':'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=1400&h=800&fit=crop&q=80'
};

let ok = 0, fail = 0;
for (const [name, url] of Object.entries(FOTOS)) {
  const dest = join(DIR, name);
  try {
    // Salta si ya existe con tamaño razonable
    try { const st = await stat(dest); if (st.size > 8000) { ok++; console.log('· ya existe ' + name); continue; } } catch {}
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) throw new Error('muy pequeña (' + buf.length + ')');
    await writeFile(dest, buf);
    ok++; console.log('✓ ' + name + ' (' + Math.round(buf.length/1024) + ' KB)');
  } catch (e) {
    fail++; console.log('✗ ' + name + ' — ' + e.message);
  }
}
console.log('\nDescargadas: ' + ok + ' · fallidas: ' + fail);
process.exit(fail > 0 ? 1 : 0);
