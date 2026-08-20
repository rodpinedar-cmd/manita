// Genera íconos PNG reales (192, 512, y maskable 512) para la PWA/APK usando Chromium.
import { chromium } from 'playwright';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const OUT = join(process.cwd(), '..', 'icons');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// Ícono normal: logo 🤝 sobre gradiente coral con esquinas redondeadas
function svg(size, pad) {
  const r = Math.round(size * 0.20);
  const fs = Math.round(size * (pad ? 0.42 : 0.5));
  const cy = Math.round(size * (pad ? 0.60 : 0.64));
  return `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}</style></head><body>
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B4A"/><stop offset="100%" stop-color="#E8563A"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${pad ? 0 : r}" fill="url(#g)"/>
    <text x="50%" y="${cy}" font-size="${fs}" text-anchor="middle" font-family="sans-serif">🤝</text>
  </svg></body></html>`;
}

async function render(size, pad, name) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(svg(size, pad));
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(OUT, name), omitBackground: false });
  await page.close();
  console.log('generado', name);
}

await render(192, false, 'icon-192.png');
await render(512, false, 'icon-512.png');
await render(512, true, 'icon-maskable-512.png'); // maskable: sin esquinas, relleno completo

await browser.close();
console.log('OK íconos en /icons');
