# Manita — Migración de hosting a Cloudflare Pages (PENDIENTE)

> ⚠️ RETOMAR ESTO MÁS TARDE. Motivo: Netlify pausó los deploys por créditos agotados del ciclo.
> Todo el rediseño AZUL está en GitHub (rama main) pero NO se ve en vivo hasta migrar o
> que Netlify reactive los créditos.

## Por qué migrar
- Netlify (plan gratis) agotó los "operational credits" del mes → deploys en "Skipped".
- Cloudflare Pages es gratis, sin límite de builds, y conecta al mismo repo de GitHub.
- Ya dejamos listo el archivo `_headers` (equivalente al netlify.toml) para Cloudflare.

## Pasos (una sola vez, ~10 min)
1. Entrar a https://dash.cloudflare.com → crear cuenta gratis (o entrar).
2. Menú izquierdo → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Autorizar GitHub y elegir el repo **rodpinedar-cmd/manita**.
4. Configuración de build:
   - Framework preset: **None**
   - Build command: **(vacío)**
   - Build output directory: **.** (un punto) o vacío
5. **Save and Deploy**. En 1-2 min da una URL tipo `manita.pages.dev` con el diseño AZUL.
6. (Opcional) Conectar el dominio propio si más adelante compras uno.

## Qué NO hay que tocar
- `_headers` ya replica: SW no-cache, assetlinks como JSON, revalidar CSS/JS. Cloudflare lo respeta.
- El código está 100% listo. Es solo cuestión de publicar.

## Tras migrar — recordatorios
- Actualizar en el código las URLs `manita-cdmx.netlify.app` → la nueva URL (canonical, og:url,
  QR de descarga) si se decide usar la de Cloudflare como oficial. (Grep: `manita-cdmx.netlify.app`.)
- Actualizar Site URL / Redirect en Supabase Auth a la nueva URL.
- Regenerar los QR de la landing si cambia el dominio.
