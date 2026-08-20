# Cómo generar el APK/AAB de Manita (gratis, igual que WELO)

Manita ya es una PWA instalable. Para tener un **APK** (archivo instalable de Android que puedes pasar por link/WhatsApp) usamos **PWABuilder**, la misma herramienta gratuita con la que se hizo WELO. No requiere Android Studio, ni compilar nada, ni pagar.

## Requisito previo
La PWA debe estar publicada con HTTPS. Ya lo está: `https://manita-cdmx.netlify.app`
(Asegúrate de haber hecho push a Netlify para que el `manifest.json`, `sw.js` y las páginas estén en vivo.)

## Pasos (10 minutos)

### 1. Genera el paquete Android
1. Entra a **https://www.pwabuilder.com**
2. Pega tu URL: `https://manita-cdmx.netlify.app`
3. Click **Start** → PWABuilder analiza tu manifest y service worker (deberían salir en verde).
4. En la sección **Android**, click **Download** / **Generate Package**.
5. Opciones de empaquetado:
   - **Package ID (applicationId):** `mx.manita.twa` (o el que prefieras, formato inverso de dominio).
   - **App name:** Manita
   - **Signing key:** deja **"Create new"** la primera vez (PWABuilder genera el keystore).
6. Descarga el ZIP. Contiene:
   - `Manita.apk` → el instalable para pasar por link/WhatsApp
   - `Manita.aab` → solo si algún día subes a Google Play (opcional, $25 una vez)
   - `signing.keystore` + `signing-key-info.txt` → **GUÁRDALOS**, los necesitas para futuras versiones
   - `assetlinks.json` → hay que subirlo a la web (paso 2)

### 2. Vincula el APK con tu web (Digital Asset Links)
Esto hace que la app abra en pantalla completa (sin barra del navegador).
1. Abre el `assetlinks.json` que te dio PWABuilder. Contiene el `package_name` y el `sha256_cert_fingerprints`.
2. Copia su contenido dentro de `.well-known/assetlinks.json` de este proyecto (reemplaza el placeholder).
3. Haz commit y push a Netlify.
4. Verifica que carga en: `https://manita-cdmx.netlify.app/.well-known/assetlinks.json`

### 3. Instala/prueba el APK
- Pásate el `Manita.apk` al teléfono (WhatsApp, Drive, cable).
- En Android: abrir el archivo → "Instalar apps de fuentes desconocidas" (permitir para esa vez).
- La app abre Manita en pantalla completa con su ícono 🤝.

## Guarda esto en lugar seguro (como WELO)
- `signing.keystore` y su contraseña → sin esto NO puedes publicar actualizaciones de la misma app.
- Documenta el `package_name` que elegiste.

## ¿AAB para Google Play? (opcional, más adelante)
El `.aab` es el formato que pide Google Play. Solo si decides publicar en la tienda:
- Cuenta de Google Play Developer: **$25 USD una sola vez**.
- Subes el `.aab`, llenas la ficha (ASO), y en unas horas/días queda publicada.
- No es necesario para usar la app: el APK directo ya funciona.

## Nota técnica
- El APK es un **TWA (Trusted Web Activity)**: un contenedor que muestra tu PWA. Cualquier cambio que publiques en la web se refleja en la app automáticamente (no hay que regenerar el APK salvo que cambies ícono/nombre/permisos).
- Por eso el mantenimiento es cero: una sola base de código (la web) sirve para web + PWA + APK.
