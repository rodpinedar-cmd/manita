# AUDITORÍA MANITA — Plan Maestro (Backlog de 200 mejoras)

> Fuente de verdad para convertir Manita en un producto 10/10.
> Marketplace de servicios a domicilio (CDMX) · Stack: HTML/CSS/JS + Supabase + Netlify.
> Generado como plan maestro. **No implementar hasta convertir en spec técnico.**

## Cómo leer este documento
- **Prioridad:** P0 (bloqueante/riesgo) · P1 (fundacional/alto valor) · P2 (crecimiento/diferenciación) · P3 (pulido).
- **Impacto / Esfuerzo:** escala 1-10.
- **ROI:** relación impacto/esfuerzo ajustada a valor de negocio (Muy Alto / Alto / Medio / Bajo).
- **Decisión:** KEEP / FIX / REDESIGN / DELETE / BUILD / REPLACE.
- **Orden:** por prioridad y **dependencias reales** (un item nunca aparece antes que aquello de lo que depende).
- **Dependencias:** referencian IDs de este mismo backlog (`—` = sin dependencias).

## Áreas
`SEG` Seguridad · `RLS` Supabase/RLS · `CORE` Core marketplace · `RES` Reservas · `PAY` Pagos · `PRO` Profesionales · `TRUST` Confianza/reputación · `CHAT` Chat/comunicación · `UX` UX/UI · `A11Y` Accesibilidad · `SEO` SEO · `PERF` Rendimiento · `ARCH` Arquitectura · `PWA` PWA/Mobile · `ANLY` Analytics · `GROW` Marketing/Growth · `RET` Retención · `MON` Monetización · `IA` IA · `BRAND` Marca · `LEGAL` Legal · `SCALE` Escalabilidad

---

## BLOQUE P0 — Riesgos y fundaciones bloqueantes (M001–M028)

### M001 · Config Auth URL en Supabase (Netlify)
- **Problema:** El login/registro puede fallar en producción porque Supabase no tiene autorizada la URL de Netlify.
- **Solución:** Site URL = `https://manita-cdmx.netlify.app` + Redirect `.../**` en Authentication → URL Configuration.
- **Beneficio:** El login funciona en vivo. Desbloquea todo el flujo autenticado.
- **Área:** RLS · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 1 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 10 min · **Decisión:** FIX

### M002 · RLS: precio de reserva server-side
- **Problema:** `crearReserva` envía `price` desde el cliente; la policy solo valida `client_id`. Fraude de precio trivial.
- **Solución:** RPC `crear_reserva(p_professional_id,p_date,p_time,p_address)` `SECURITY DEFINER` que lee el precio de `professionals`. Revocar INSERT directo a `bookings`.
- **Beneficio:** Elimina manipulación de precios. Base para pagos.
- **Área:** SEG · **Prioridad:** P0 · **Impacto:** 10 · **Esfuerzo:** 3 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** M001 · **Tiempo:** 2 d · **Decisión:** REDESIGN

### M003 · RLS: bloquear auto-edición de verified/rating/reviews_count
- **Problema:** La policy UPDATE de `professionals` permite editar cualquier columna, incl. `verified`, `rating`.
- **Solución:** Trigger `BEFORE UPDATE` que revierte cambios a columnas protegidas; solo servidor/admin las modifica.
- **Beneficio:** Confianza no falsificable.
- **Área:** SEG · **Prioridad:** P0 · **Impacto:** 9 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 d · **Decisión:** FIX

### M004 · Eliminar datos falsos (prensa, stats, testimonios)
- **Problema:** "+50 mil servicios", medios reales con quotes inventados, testimonios ficticios. Riesgo PROFECO.
- **Solución:** DELETE secciones; reemplazar por copy honesto de lanzamiento ("Nuevo en CDMX").
- **Beneficio:** Elimina riesgo legal y publicidad engañosa.
- **Área:** LEGAL · **Prioridad:** P0 · **Impacto:** 8 · **Esfuerzo:** 1 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 h · **Decisión:** DELETE

### M005 · Eliminar SAMPLE_REVIEWS y badges sociales inventados
- **Problema:** `perfil.js` muestra reseñas hardcodeadas; `servicios.js` inventa "X han repetido"/"Agenda actualizada".
- **Solución:** DELETE; sustituir por datos reales cuando existan (M016, M034).
- **Beneficio:** Cero métricas falsas.
- **Área:** LEGAL · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 1 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 1 h · **Decisión:** DELETE

### M006 · Policy: profesional ve/gestiona sus reservas
- **Problema:** No existe policy SELECT/UPDATE de `bookings` para el profesional. El proveedor nunca ve la reserva.
- **Solución:** Policy `USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id))`.
- **Beneficio:** Cierra el lado proveedor del marketplace.
- **Área:** RLS · **Prioridad:** P0 · **Impacto:** 9 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 1 d · **Decisión:** BUILD

### M007 · Máquina de estados de reserva
- **Problema:** `bookings.status` nunca cambia. Sin transiciones no hay servicio real.
- **Solución:** Estados `pending→confirmed→in_progress→completed→reviewed` + `cancelled`; RPCs por transición con validación de rol.
- **Beneficio:** Habilita pago, reseñas y operación.
- **Área:** RES · **Prioridad:** P0 · **Impacto:** 9 · **Esfuerzo:** 5 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M002, M006 · **Tiempo:** 4 d · **Decisión:** BUILD

### M008 · Panel del profesional (mínimo)
- **Problema:** No hay dónde el pro acepte/rechace/gestione reservas.
- **Solución:** Página `pro-panel.html`: lista de reservas entrantes con acciones de transición (M007).
- **Beneficio:** Operación básica del proveedor.
- **Área:** PRO · **Prioridad:** P0 · **Impacto:** 8 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M006, M007 · **Tiempo:** 4 d · **Decisión:** BUILD

### M009 · Reseñas verificadas (solo post-servicio)
- **Problema:** Policy de reviews no exige booking completado. Reseñas falsificables.
- **Solución:** RPC `crear_reseña(booking_id,rating,comment)` que valida `status='completed'` y `client_id=auth.uid()`.
- **Beneficio:** Reputación real, base del trust.
- **Área:** TRUST · **Prioridad:** P0 · **Impacto:** 8 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M007 · **Tiempo:** 2 d · **Decisión:** REDESIGN

### M010 · Trigger de rating/reviews_count desde reviews reales
- **Problema:** `rating`/`reviews_count` son campos libres sin fuente real.
- **Solución:** Trigger `AFTER INSERT/UPDATE/DELETE ON reviews` que recalcula agregados en `professionals`.
- **Beneficio:** Rating siempre veraz y consistente.
- **Área:** TRUST · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M009 · **Tiempo:** 1 d · **Decisión:** BUILD

### M011 · Integración de pagos con escrow
- **Problema:** No existe pago. El negocio no factura y la "Garantía Manita" es falsa.
- **Solución:** Stripe/MercadoPago con `capture_method: manual`: autoriza al reservar, captura al completar; comisión de plataforma.
- **Beneficio:** Habilita ingresos y garantía real.
- **Área:** PAY · **Prioridad:** P0 · **Impacto:** 10 · **Esfuerzo:** 8 · **ROI:** Muy Alto · **Riesgo:** Medio · **Deps:** M002, M007 · **Tiempo:** 3 sem · **Decisión:** BUILD

### M012 · Webhooks de pago → estado de reserva
- **Problema:** Sin sincronía entre pago y reserva.
- **Solución:** Edge Function webhook que actualiza `payment_status` y dispara transiciones.
- **Beneficio:** Consistencia dinero-servicio.
- **Área:** PAY · **Prioridad:** P0 · **Impacto:** 8 · **Esfuerzo:** 5 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M011 · **Tiempo:** 4 d · **Decisión:** BUILD

### M013 · Header/footer componentizados
- **Problema:** Header duplicado y divergente en 8 páginas; botón de cuenta hace cosas distintas por página.
- **Solución:** `components.js` con `mountHeader()`/`mountFooter()` que refleja sesión real.
- **Beneficio:** Consistencia y mantenimiento ×1. Desbloquea A11Y y migración.
- **Área:** ARCH · **Prioridad:** P0 · **Impacto:** 8 · **Esfuerzo:** 2 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 d · **Decisión:** REDESIGN

### M014 · Eliminar botones muertos href="#"
- **Problema:** "Entrar" en varias páginas es `href="#"`; navegación rota.
- **Solución:** Links reales a `login.html`/estado de sesión (via M013).
- **Beneficio:** Navegación coherente.
- **Área:** UX · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 1 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M013 · **Tiempo:** 1 d · **Decisión:** FIX

### M015 · Guard de sesión consistente
- **Problema:** Se puede intentar reservar sin sesión y solo falla al insertar; botón cuenta inconsistente.
- **Solución:** Helper `requireAuth(next)` reutilizable; header refleja login/logout uniforme.
- **Beneficio:** UX de auth predecible.
- **Área:** UX · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M013 · **Tiempo:** 1 d · **Decisión:** FIX

### M016 · Perfil lee reseñas reales (obtenerReseñas)
- **Problema:** `obtenerReseñas()` existe pero nunca se llama; el perfil usa SAMPLE_REVIEWS.
- **Solución:** Conectar `obtenerReseñas(proId)` en `perfil.js`.
- **Beneficio:** Reseñas reales visibles.
- **Área:** TRUST · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M005, M009 · **Tiempo:** 1 d · **Decisión:** FIX

### M017 · Reemplazar alert/confirm/prompt por UI propia
- **Problema:** `perfil.js` y `ser-profesional.html` usan diálogos nativos; UX amateur y bloqueante.
- **Solución:** Sistema de toasts + modales propios + página de confirmación de reserva.
- **Beneficio:** Percepción de producto serio.
- **Área:** UX · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M013 · **Tiempo:** 2 d · **Decisión:** REDESIGN

### M018 · Manejo de error de red + estados de carga
- **Problema:** Si Supabase falla, `res.data=[]` y se muestra "No encontramos profesionales" (engañoso).
- **Solución:** Skeletons + estado de error explícito con reintento; distinguir vacío de error.
- **Beneficio:** Confianza y diagnóstico.
- **Área:** UX · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 d · **Decisión:** BUILD

### M019 · Fuente única de datos (Supabase, no data.js)
- **Problema:** `data.js` (PROS/CATEGORIES/POPULAR) coexiste con Supabase; `categorias.html` solo usa data.js.
- **Solución:** Supabase única fuente; `data.js` queda solo para taxonomía UI estática hasta modelarla en DB (M020).
- **Beneficio:** Fin de la doble verdad e inconsistencias.
- **Área:** ARCH · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M013 · **Tiempo:** 3 d · **Decisión:** REPLACE

### M020 · Categorías reales desde DB (obtenerCategorias)
- **Problema:** `obtenerCategorias()` existe pero nunca se usa; categorías viven en data.js y DB.
- **Solución:** Modelar taxonomía (grupos/sub) en `categories` y consumir desde DB.
- **Beneficio:** Catálogo consistente y editable sin deploy.
- **Área:** CORE · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M019 · **Tiempo:** 3 d · **Decisión:** FIX

### M021 · Corregir seed: subcategorías reales en profesionales
- **Problema:** El seed asigna `category_id` genérico ('limpieza') en vez de subcategorías.
- **Solución:** Reasignar `category_id` a subcategorías correctas; migración de datos.
- **Beneficio:** Filtros y búsqueda funcionales.
- **Área:** CORE · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M020 · **Tiempo:** 1 d · **Decisión:** FIX

### M022 · Filtro por category_id real (no string-match)
- **Problema:** `servicios.js` filtra subcategoría por primera palabra del nombre; impredecible.
- **Solución:** Filtrar por `category_id`/`parent_id` reales.
- **Beneficio:** Resultados correctos.
- **Área:** CORE · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M021 · **Tiempo:** 1 d · **Decisión:** FIX

### M023 · Aviso de privacidad y términos (LFPDPPP)
- **Problema:** Se recogen datos personales (dirección, teléfono) sin aviso; footer legal en `href="#"`.
- **Solución:** Páginas reales de aviso de privacidad, términos, cookies conformes a ley mexicana.
- **Beneficio:** Cumplimiento legal.
- **Área:** LEGAL · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 d · **Decisión:** BUILD

### M024 · Guardar teléfono del profesional
- **Problema:** `ser-profesional.html` pide teléfono pero no lo guarda en ningún lado.
- **Solución:** Persistir `phone` en `profiles`/`professionals`.
- **Beneficio:** Contacto y verificación posibles.
- **Área:** PRO · **Prioridad:** P0 · **Impacto:** 5 · **Esfuerzo:** 1 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 0.5 d · **Decisión:** FIX

### M025 · Precio elegible por el profesional
- **Problema:** Todos los profesionales se crean con `price:300` fijo.
- **Solución:** Campo de precio + unidad en el alta.
- **Beneficio:** Pricing real del marketplace.
- **Área:** PRO · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M024 · **Tiempo:** 1 d · **Decisión:** FIX

### M026 · Notificación al pro de nueva reserva (email)
- **Problema:** Nadie avisa al profesional cuando llega una reserva.
- **Solución:** Edge Function + Resend en el INSERT/transición de reserva.
- **Beneficio:** Reservas atendidas; loop operativo.
- **Área:** CHAT · **Prioridad:** P0 · **Impacto:** 8 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M007 · **Tiempo:** 3 d · **Decisión:** BUILD

### M027 · Pin de versión de dependencias (Supabase CDN)
- **Problema:** `@supabase/supabase-js@2` sin pin: un minor puede romper producción.
- **Solución:** Fijar versión exacta.
- **Beneficio:** Builds reproducibles.
- **Área:** ARCH · **Prioridad:** P0 · **Impacto:** 5 · **Esfuerzo:** 1 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 0.5 d · **Decisión:** FIX

### M028 · Confirmación de reserva como página real
- **Problema:** La reserva termina en un `alert()` sin recibo ni detalle persistente.
- **Solución:** Página `reserva-confirmada.html` con detalle, estado y siguiente paso.
- **Beneficio:** Cierre de flujo profesional.
- **Área:** RES · **Prioridad:** P0 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M017 · **Tiempo:** 1 d · **Decisión:** REDESIGN

---

## BLOQUE P1 — Marketplace transaccional, confianza y foundations (M029–M100)

### M029 · Onboarding profesional tipo wizard
- **Problema:** Alta con `prompt()` nativo, sin foto/precio/bio reales; perfil genérico.
- **Solución:** Wizard multipaso: datos → servicio+precio → foto+bio+portafolio → verificación; auth integrada.
- **Beneficio:** Oferta de calidad; base del marketplace.
- **Área:** PRO · **Prioridad:** P1 · **Impacto:** 8 · **Esfuerzo:** 5 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M024, M025, M031 · **Tiempo:** 1 sem · **Decisión:** REDESIGN

### M030 · Disponibilidad real del profesional
- **Problema:** Horas fijas para todos; posible doble booking.
- **Solución:** Tabla `availability` (slots) + validación de solapamiento en RPC de reserva.
- **Beneficio:** Sin choques de agenda.
- **Área:** RES · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 5 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M002, M008 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M031 · Supabase Storage para fotos
- **Problema:** No hay almacenamiento de imágenes; avatares emoji.
- **Solución:** Bucket con políticas; subida de foto de perfil y portafolio.
- **Beneficio:** Perfiles reales y confiables.
- **Área:** ARCH · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 d · **Decisión:** BUILD

### M032 · Avatar consistente (foto real + fallback iniciales)
- **Problema:** Avatares aleatorios por índice en listado y `🧑` fijo en perfil.
- **Solución:** `avatar_url` real; fallback determinístico por nombre.
- **Beneficio:** Identidad coherente.
- **Área:** UX · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M031 · **Tiempo:** 1 d · **Decisión:** FIX

### M033 · Notificación al cliente (confirmación/estado)
- **Problema:** El cliente no recibe avisos de cambios de estado.
- **Solución:** Emails transaccionales por transición (confirmada, en camino, completada).
- **Beneficio:** Reduce ansiedad, no-shows.
- **Área:** CHAT · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M026 · **Tiempo:** 2 d · **Decisión:** BUILD

### M034 · UI de dejar reseña tras servicio
- **Problema:** No hay pantalla para reseñar.
- **Solución:** Flujo post-completado que llama a `crear_reseña` (M009).
- **Beneficio:** Genera reputación real.
- **Área:** TRUST · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M009 · **Tiempo:** 2 d · **Decisión:** BUILD

### M035 · Chat cliente↔profesional (Realtime)
- **Problema:** Sin canal de coordinación; riesgo de desintermediación.
- **Solución:** Tabla `messages` + Supabase Realtime; UI de conversación por reserva.
- **Beneficio:** Coordinación in-app, retención de la transacción.
- **Área:** CHAT · **Prioridad:** P1 · **Impacto:** 8 · **Esfuerzo:** 6 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M007 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M036 · Cancelación con reglas y política
- **Problema:** No hay flujo de cancelación ni reembolso.
- **Solución:** Reglas (ventana de cancelación, penalización) integradas con pago (M012).
- **Beneficio:** Operación justa y clara.
- **Área:** RES · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M007, M012 · **Tiempo:** 3 d · **Decisión:** BUILD

### M037 · Payout al profesional (Stripe Connect)
- **Problema:** No hay forma de pagar al pro tras completar.
- **Solución:** Connect/onboarding de payout; liberación menos comisión al completar.
- **Beneficio:** Cierra el ciclo de dinero.
- **Área:** PAY · **Prioridad:** P1 · **Impacto:** 8 · **Esfuerzo:** 6 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M011, M012 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M038 · Verificación de identidad (INE) básica
- **Problema:** Cualquiera se registra como profesional; entra a casas.
- **Solución:** Subida de INE + revisión (manual al inicio); estado `pending_review`→`verified`.
- **Beneficio:** Seguridad y confianza.
- **Área:** TRUST · **Prioridad:** P1 · **Impacto:** 8 · **Esfuerzo:** 5 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M029, M031 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M039 · SEO: meta, OG, Twitter, canonical en todas las páginas
- **Problema:** Solo index tiene description; sin OG/canonical.
- **Solución:** Metadatos completos por página.
- **Beneficio:** Indexación y compartido.
- **Área:** SEO · **Prioridad:** P1 · **Impacto:** 9 · **Esfuerzo:** 3 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** M013 · **Tiempo:** 3 d · **Decisión:** BUILD

### M040 · JSON-LD (Service, AggregateRating, LocalBusiness)
- **Problema:** Sin datos estructurados; Google no entiende el contenido.
- **Solución:** Schema.org en perfiles y categorías.
- **Beneficio:** Rich results, CTR.
- **Área:** SEO · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M039, M010 · **Tiempo:** 2 d · **Decisión:** BUILD

### M041 · sitemap.xml + robots.txt
- **Problema:** No existen; crawling ineficiente.
- **Solución:** Generación automática de sitemap y robots.
- **Beneficio:** Cobertura de indexación.
- **Área:** SEO · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M039 · **Tiempo:** 1 d · **Decisión:** BUILD

### M042 · Migración a Astro (SSG/SSR + componentes)
- **Problema:** Render 100% client-side; Googlebot ve HTML vacío; sin build.
- **Solución:** Migrar a Astro + Vite reusando Supabase; componentes reales.
- **Beneficio:** SEO, rendimiento y velocidad de desarrollo.
- **Área:** ARCH · **Prioridad:** P1 · **Impacto:** 8 · **Esfuerzo:** 8 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M013, M019 · **Tiempo:** 2 sem · **Decisión:** REPLACE

### M043 · Páginas categoría×zona indexables
- **Problema:** Sin páginas SEO locales ("Limpieza en Roma Norte").
- **Solución:** Generar rutas por categoría y zona con contenido único.
- **Beneficio:** Canal de adquisición orgánica #1.
- **Área:** SEO · **Prioridad:** P1 · **Impacto:** 9 · **Esfuerzo:** 5 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** M042, M022 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M044 · URLs semánticas (slug de servicio/pro)
- **Problema:** `perfil.html?id=<uuid>` no es SEO-friendly.
- **Solución:** Slugs `/servicios/limpieza/diana-ramirez`.
- **Beneficio:** CTR y relevancia.
- **Área:** SEO · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M042 · **Tiempo:** 3 d · **Decisión:** REDESIGN

### M045 · PWA instalable (manifest + service worker)
- **Problema:** No hay PWA; el QR promete app inexistente.
- **Solución:** manifest + SW (shell offline); QR apunta a instalar PWA.
- **Beneficio:** Instalable en móvil sin app store.
- **Área:** PWA · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** 3 d · **Decisión:** BUILD

### M046 · Analítica de producto (Plausible/GA4)
- **Problema:** Cero visibilidad de comportamiento.
- **Solución:** Analítica respetuosa + eventos clave (búsqueda, reserva, pago).
- **Beneficio:** Decisiones basadas en datos.
- **Área:** ANLY · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 2 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 1 d · **Decisión:** BUILD

### M047 · Embudo de conversión instrumentado
- **Problema:** No se mide dónde se cae el usuario.
- **Solución:** Eventos de funnel (view→search→profile→book→pay) y dashboard.
- **Beneficio:** Optimización de conversión.
- **Área:** ANLY · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M046 · **Tiempo:** 2 d · **Decisión:** BUILD

### M048 · Accesibilidad: semántica de botones/acciones
- **Problema:** Acciones en `<a href="#">` con onclick.
- **Solución:** `<button>` para acciones; roles correctos.
- **Beneficio:** A11Y y SEO.
- **Área:** A11Y · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M013 · **Tiempo:** 2 d · **Decisión:** FIX

### M049 · Accesibilidad: focus trap + Esc en modales, aria-modal
- **Problema:** Modal QR sin gestión de foco ni cierre por teclado.
- **Solución:** Focus trap, `role="dialog"`, `aria-modal`, cierre con Esc.
- **Beneficio:** Navegación por teclado.
- **Área:** A11Y · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M017 · **Tiempo:** 1 d · **Decisión:** FIX

### M050 · Accesibilidad: labels, aria en inputs e iconos
- **Problema:** Inputs solo con placeholder; emojis sin aria.
- **Solución:** `<label>`, `aria-label`, `aria-hidden` en decorativos.
- **Beneficio:** Lectores de pantalla.
- **Área:** A11Y · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M013 · **Tiempo:** 2 d · **Decisión:** FIX

### M051 · Contraste AA + skip-link + foco visible
- **Problema:** Contraste del hero sin verificar; sin skip-link.
- **Solución:** Ajustar contraste a AA, skip-link, estilos de foco.
- **Beneficio:** Cumplimiento WCAG AA.
- **Área:** A11Y · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M052 · **Tiempo:** 2 d · **Decisión:** FIX

### M052 · Rediseño de hero (paleta propia, no teal de Webel)
- **Problema:** Hero usa el teal de Webel; contradice la marca coral y acerca a plagio.
- **Solución:** Hero con paleta coral/índigo, buscador integrado, ilustración propia.
- **Beneficio:** Identidad propia; menos riesgo IP.
- **Área:** BRAND · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 3 d · **Decisión:** REDESIGN

### M053 · Reescritura de copy con voz propia mexicana
- **Problema:** Copy calcado de Webel ("Haz tu vida más fácil", etc.).
- **Solución:** Reescribir toda la web con voz propia; reordenar secciones.
- **Beneficio:** Marca diferenciada; menos riesgo legal.
- **Área:** BRAND · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M004 · **Tiempo:** 1 sem · **Decisión:** REDESIGN

### M054 · Autohostear imágenes (Storage + CDN + WebP)
- **Problema:** Imágenes hotlinkeadas de Unsplash; riesgo de caída/rate-limit; LCP dependiente.
- **Solución:** Descargar/optimizar a Storage/CDN, `srcset`, WebP/AVIF, dimensiones.
- **Beneficio:** Rendimiento y control.
- **Área:** PERF · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M031 · **Tiempo:** 2 d · **Decisión:** FIX

### M055 · Preconnect/preload de fuentes en todas las páginas
- **Problema:** Poppins sin preconnect en 7/8 páginas; bloquea render.
- **Solución:** preconnect + font-display swap; autohostear fuente.
- **Beneficio:** Mejor LCP/CLS.
- **Área:** PERF · **Prioridad:** P1 · **Impacto:** 4 · **Esfuerzo:** 1 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 0.5 d · **Decisión:** FIX

### M056 · Eliminar CSS muerto (.hero-inner, .hero-image)
- **Problema:** Reglas de selectores inexistentes (residuo).
- **Solución:** DELETE código muerto.
- **Beneficio:** CSS más ligero y claro.
- **Área:** PERF · **Prioridad:** P1 · **Impacto:** 2 · **Esfuerzo:** 1 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M052 · **Tiempo:** 0.5 d · **Decisión:** DELETE

### M057 · Geolocalización / selección de zona real
- **Problema:** "Zona" es texto libre; sin geo.
- **Solución:** Selector de colonia/CP; PostGIS para búsqueda por proximidad (fase escala).
- **Beneficio:** Resultados relevantes por cercanía.
- **Área:** CORE · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M022 · **Tiempo:** 4 d · **Decisión:** BUILD

### M058 · Búsqueda full-text (Postgres FTS + pg_trgm)
- **Problema:** Búsqueda por `indexOf` en cliente; no escala ni tolera errores.
- **Solución:** FTS + trigram en servidor.
- **Beneficio:** Búsqueda robusta.
- **Área:** CORE · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M020 · **Tiempo:** 3 d · **Decisión:** REPLACE

### M059 · Perfil de usuario/cliente editable
- **Problema:** No hay pantalla de perfil de cliente (nombre, teléfono, direcciones).
- **Solución:** Página de cuenta con datos y direcciones guardadas.
- **Beneficio:** Reserva más rápida; retención.
- **Área:** CORE · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M015 · **Tiempo:** 3 d · **Decisión:** BUILD

### M060 · Direcciones guardadas del cliente
- **Problema:** Se teclea la dirección en cada reserva.
- **Solución:** CRUD de direcciones reutilizables.
- **Beneficio:** Menos fricción, más conversión.
- **Área:** RES · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M059 · **Tiempo:** 2 d · **Decisión:** BUILD

### M061 · Reserva: resumen de precio y desglose
- **Problema:** Total plano sin desglose (servicio, comisión, garantía).
- **Solución:** Desglose claro server-calculado.
- **Beneficio:** Transparencia, confianza.
- **Área:** RES · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M002 · **Tiempo:** 1 d · **Decisión:** FIX

### M062 · Recibos/comprobantes de reserva
- **Problema:** Sin comprobante tras pagar.
- **Solución:** Recibo por email/descarga.
- **Beneficio:** Confianza y soporte.
- **Área:** PAY · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M011 · **Tiempo:** 2 d · **Decisión:** BUILD

### M063 · Estados enriquecidos en "Mis reservas"
- **Problema:** Estados mapeados que nunca ocurren; sin acciones.
- **Solución:** Estados reales + acciones (chat, cancelar, reseñar, repetir).
- **Beneficio:** Centro de control del cliente.
- **Área:** RES · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M007, M034, M035 · **Tiempo:** 3 d · **Decisión:** REDESIGN

### M064 · Programa de referidos
- **Problema:** Sin loop de crecimiento; CAC alto.
- **Solución:** Códigos de referido con crédito bidireccional.
- **Beneficio:** Crecimiento viral orgánico.
- **Área:** GROW · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M011, M059 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M065 · Email lifecycle (bienvenida, reactivación)
- **Problema:** Sin comunicación de ciclo de vida.
- **Solución:** Secuencias automatizadas por evento/segmento.
- **Beneficio:** Retención y reactivación.
- **Área:** RET · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M026, M046 · **Tiempo:** 3 d · **Decisión:** BUILD

### M066 · "Reservar de nuevo" (recompra 1-tap)
- **Problema:** Recompra manual desde cero.
- **Solución:** Botón que reusa pro+dirección+servicio anteriores.
- **Beneficio:** Frecuencia de recompra.
- **Área:** RET · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M063 · **Tiempo:** 1 d · **Decisión:** BUILD

### M067 · Favoritos / guardar profesionales
- **Problema:** No se puede guardar un pro de confianza.
- **Solución:** Lista de favoritos por usuario.
- **Beneficio:** Recompra y vínculo.
- **Área:** RET · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M059 · **Tiempo:** 1 d · **Decisión:** BUILD

### M068 · Comisión de plataforma configurable (take rate)
- **Problema:** No hay modelo de ingreso definido en el código.
- **Solución:** Take rate configurable aplicado en pago/payout.
- **Beneficio:** Monetización clara.
- **Área:** MON · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 2 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** M011, M037 · **Tiempo:** 1 d · **Decisión:** BUILD

### M069 · Web Share + compartir perfil
- **Problema:** Sin compartir nativo.
- **Solución:** Web Share API + OG por perfil.
- **Beneficio:** Distribución orgánica.
- **Área:** GROW · **Prioridad:** P1 · **Impacto:** 4 · **Esfuerzo:** 1 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M040 · **Tiempo:** 0.5 d · **Decisión:** BUILD

### M070 · Soporte / centro de ayuda + contacto real
- **Problema:** "Soporte 365 días" prometido sin canal.
- **Solución:** Centro de ayuda + formulario/email real.
- **Beneficio:** Confianza y resolución.
- **Área:** TRUST · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 d · **Decisión:** BUILD

### M071 · Manejo de errores global + logging (Sentry)
- **Problema:** Errores JS silenciosos; sin observabilidad.
- **Solución:** Captura global de errores + Sentry.
- **Beneficio:** Diagnóstico y estabilidad.
- **Área:** ARCH · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 1 d · **Decisión:** BUILD

### M072 · Rate limiting / anti-abuso en RPCs
- **Problema:** RPCs sin límites; abuso posible.
- **Solución:** Rate limiting y validaciones en Edge/DB.
- **Beneficio:** Protección de recursos.
- **Área:** SEG · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M002 · **Tiempo:** 2 d · **Decisión:** BUILD

### M073 · Validación/sanitización de inputs
- **Problema:** Inputs sin validación robusta (dirección, teléfono, textos).
- **Solución:** Validación cliente+servidor; sanitizar salida.
- **Beneficio:** Seguridad y calidad de datos.
- **Área:** SEG · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 2 d · **Decisión:** FIX

### M074 · Confirmación de email obligatoria + reenvío
- **Problema:** Flujo de confirmación confuso; sin reenvío.
- **Solución:** UX clara de verificación + botón reenviar.
- **Beneficio:** Menos cuentas fantasma.
- **Área:** SEG · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M001 · **Tiempo:** 1 d · **Decisión:** FIX

### M075 · Login social + magic link
- **Problema:** Solo email/password; fricción.
- **Solución:** OAuth (Google/Apple) + magic link.
- **Beneficio:** Más conversión de registro.
- **Área:** UX · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M001 · **Tiempo:** 2 d · **Decisión:** BUILD

### M076 · Búsqueda con filtros de precio y rating
- **Problema:** Filtros limitados (categoría, verificado, disponible).
- **Solución:** Filtros de rango de precio, rating mínimo, orden.
- **Beneficio:** Mejor descubrimiento.
- **Área:** CORE · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M022 · **Tiempo:** 2 d · **Decisión:** BUILD

### M077 · Paginación / carga incremental de resultados
- **Problema:** Se cargan todos los pros de golpe.
- **Solución:** Paginación server-side / infinite scroll.
- **Beneficio:** Rendimiento a escala.
- **Área:** PERF · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M058 · **Tiempo:** 2 d · **Decisión:** BUILD

### M078 · Índices de base de datos clave
- **Problema:** Sin índices compuestos para consultas frecuentes.
- **Solución:** Índices en `(category_id, rating)`, `(professional_id, service_date)`, etc.
- **Beneficio:** Latencia baja.
- **Área:** SCALE · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** M021 · **Tiempo:** 1 d · **Decisión:** BUILD

### M079 · Backups y política de recuperación
- **Problema:** Sin estrategia de respaldo verificada.
- **Solución:** Backups automáticos + prueba de restore.
- **Beneficio:** Continuidad de negocio.
- **Área:** SCALE · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 1 d · **Decisión:** BUILD

### M080 · Entornos separados (dev/staging/prod)
- **Problema:** Se trabaja contra un solo proyecto Supabase.
- **Solución:** Proyectos/branches separados + variables de entorno.
- **Beneficio:** Despliegues seguros.
- **Área:** ARCH · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** 2 d · **Decisión:** BUILD

### M081 · CI/CD con checks (lint, build, tests)
- **Problema:** Deploy directo sin validación.
- **Solución:** Pipeline en GitHub Actions previo a Netlify.
- **Beneficio:** Menos regresiones.
- **Área:** ARCH · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** 2 d · **Decisión:** BUILD

### M082 · Tests de flujos críticos (reserva, pago, auth)
- **Problema:** Sin pruebas; cambios rompen sin aviso.
- **Solución:** Tests e2e (Playwright) de flujos clave.
- **Beneficio:** Confianza en releases.
- **Área:** ARCH · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M011, M081 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M083 · i18n base (es-MX) + estructura multi-idioma
- **Problema:** Textos embebidos; sin estructura de traducción.
- **Solución:** Extraer strings; preparar i18n aunque solo es-MX hoy.
- **Beneficio:** Expansión futura sin refactor.
- **Área:** ARCH · **Prioridad:** P1 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** 2 d · **Decisión:** BUILD

### M084 · Onboarding cliente contextual (buscar sin registro)
- **Problema:** Fricción de registro temprano.
- **Solución:** Explorar/buscar libre; pedir cuenta solo al reservar.
- **Beneficio:** Más conversión.
- **Área:** UX · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M015 · **Tiempo:** 1 d · **Decisión:** REDESIGN

### M085 · Estimador de ingresos para el profesional
- **Problema:** Landing de pro sin gancho cuantitativo.
- **Solución:** Calculadora "cuánto puedes ganar".
- **Beneficio:** Más registros de pros.
- **Área:** GROW · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M029 · **Tiempo:** 1 d · **Decisión:** BUILD

### M086 · Moderación básica de contenido (fotos/bio)
- **Problema:** Contenido de pros sin revisión.
- **Solución:** Cola de moderación + reglas básicas.
- **Beneficio:** Calidad y seguridad.
- **Área:** TRUST · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M038 · **Tiempo:** 3 d · **Decisión:** BUILD

### M087 · Reportar profesional / reserva
- **Problema:** Sin mecanismo de denuncia.
- **Solución:** Flujo de reporte + revisión.
- **Beneficio:** Seguridad de la comunidad.
- **Área:** TRUST · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M070 · **Tiempo:** 2 d · **Decisión:** BUILD

### M088 · Política de cookies + banner de consentimiento
- **Problema:** Analítica sin consentimiento.
- **Solución:** Banner y gestión de consentimiento.
- **Beneficio:** Cumplimiento legal.
- **Área:** LEGAL · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M046 · **Tiempo:** 1 d · **Decisión:** BUILD

### M089 · Responsive/mobile-first audit y fixes
- **Problema:** Layout pensado desktop; búsqueda del header no colapsa bien en móvil.
- **Solución:** Auditar y corregir breakpoints; menú móvil.
- **Beneficio:** UX móvil (mayoría del tráfico).
- **Área:** UX · **Prioridad:** P1 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M013 · **Tiempo:** 3 d · **Decisión:** FIX

### M090 · Menú de navegación móvil (hamburguesa)
- **Problema:** `.nav { display:none }` en móvil sin alternativa.
- **Solución:** Menú hamburguesa accesible.
- **Beneficio:** Navegación móvil completa.
- **Área:** UX · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M089 · **Tiempo:** 1 d · **Decisión:** BUILD

### M091 · Página 404 y estados vacíos con marca
- **Problema:** Sin 404; estados vacíos pobres.
- **Solución:** 404 y empty states diseñados.
- **Beneficio:** Percepción de calidad.
- **Área:** UX · **Prioridad:** P1 · **Impacto:** 3 · **Esfuerzo:** 1 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** 0.5 d · **Decisión:** BUILD

### M092 · Favicon, app icons y theme-color
- **Problema:** Sin favicon/iconos de marca.
- **Solución:** Set de iconos + theme-color.
- **Beneficio:** Identidad y PWA.
- **Área:** BRAND · **Prioridad:** P1 · **Impacto:** 3 · **Esfuerzo:** 1 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M045 · **Tiempo:** 0.5 d · **Decisión:** BUILD

### M093 · Guía de marca (logo, colores, tipografía, voz)
- **Problema:** Identidad implícita, inconsistente.
- **Solución:** Documento de brand system.
- **Beneficio:** Consistencia a escala.
- **Área:** BRAND · **Prioridad:** P1 · **Impacto:** 4 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M052, M053 · **Tiempo:** 2 d · **Decisión:** BUILD

### M094 · Dashboard de métricas de negocio (GMV, take rate)
- **Problema:** Sin visión de negocio.
- **Solución:** Dashboard de GMV, reservas, conversión, retención.
- **Beneficio:** Gestión data-driven.
- **Área:** ANLY · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M047, M068 · **Tiempo:** 3 d · **Decisión:** BUILD

### M095 · Detección básica de fraude (reglas)
- **Problema:** Sin defensa ante reservas/reseñas anómalas.
- **Solución:** Reglas (velocidad, patrones, colusión) + alertas.
- **Beneficio:** Integridad del marketplace.
- **Área:** SEG · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M046, M011 · **Tiempo:** 4 d · **Decisión:** BUILD

### M096 · Notificaciones push (PWA)
- **Problema:** Sin push; dependencia de email.
- **Solución:** Web Push tras PWA.
- **Beneficio:** Reengagement.
- **Área:** RET · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M045, M033 · **Tiempo:** 3 d · **Decisión:** BUILD

### M097 · Perfil público del profesional SEO-optimizado
- **Problema:** Perfil no optimizado para búsqueda/compartir.
- **Solución:** Contenido, schema, OG por pro; portafolio.
- **Beneficio:** Adquisición y conversión.
- **Área:** SEO · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M040, M044 · **Tiempo:** 3 d · **Decisión:** REDESIGN

### M098 · Blog / contenido SEO (guías de servicios)
- **Problema:** Sin contenido para long-tail.
- **Solución:** Blog con guías ("cuánto cuesta pintar un depa en CDMX").
- **Beneficio:** Tráfico orgánico sostenido.
- **Área:** SEO · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** ongoing · **Decisión:** BUILD

### M099 · Core Web Vitals monitoring
- **Problema:** Sin medición de rendimiento real.
- **Solución:** RUM/Lighthouse CI; presupuesto de performance.
- **Beneficio:** SEO y UX medibles.
- **Área:** PERF · **Prioridad:** P1 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M081 · **Tiempo:** 1 d · **Decisión:** BUILD

### M100 · Sistema de diseño (tokens + componentes)
- **Problema:** CSS ad-hoc por página (styles inline en cada HTML).
- **Solución:** Design system con tokens y componentes reutilizables.
- **Beneficio:** Consistencia y velocidad.
- **Área:** UX · **Prioridad:** P1 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** 1 sem · **Decisión:** REDESIGN

---

## BLOQUE P2 — Growth, diferenciación e IA (M101–M165)

### M101 · Killer: Reserva por foto (IA visión)
- **Problema:** El cliente no sabe qué servicio pedir ni cuánto cuesta.
- **Solución:** Sube foto → IA identifica servicio, estima alcance/precio y sugiere pros.
- **Beneficio:** Conversión mágica; diferenciador defendible.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 9 · **Esfuerzo:** 8 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M011, M031, M058 · **Tiempo:** 4 sem · **Decisión:** BUILD

### M102 · Pricing inteligente (sugerencia IA)
- **Problema:** Pros no saben cuánto cobrar; clientes desconfían.
- **Solución:** Modelo que sugiere precio por servicio×zona×hora con datos reales.
- **Beneficio:** Precios justos; confianza.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 7 · **Esfuerzo:** 6 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M094 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M103 · Motor de recomendaciones de profesionales
- **Problema:** Orden solo por rating.
- **Solución:** Ranking multi-señal (relevancia, cercanía, historial, disponibilidad).
- **Beneficio:** Mejor match, más conversión.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 7 · **Esfuerzo:** 6 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M057, M047 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M104 · Búsqueda semántica (embeddings)
- **Problema:** Búsqueda literal no entiende intención ("armar ropero IKEA").
- **Solución:** Embeddings + pgvector para matching semántico.
- **Beneficio:** Descubrimiento superior.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 6 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M058 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M105 · Trust score dinámico del profesional
- **Problema:** `verified` es binario; no refleja calidad continua.
- **Solución:** Score multi-señal (rating, cumplimiento, respuesta, verificación).
- **Beneficio:** Ranking de calidad; ventaja competitiva.
- **Área:** TRUST · **Prioridad:** P2 · **Impacto:** 7 · **Esfuerzo:** 5 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M010, M038 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M106 · Manita Plus (suscripción de hogar)
- **Problema:** Recurrencia manual; sin MRR.
- **Solución:** Membresía con servicios recurrentes + descuentos + prioridad.
- **Beneficio:** Ingreso recurrente predecible.
- **Área:** MON · **Prioridad:** P2 · **Impacto:** 8 · **Esfuerzo:** 6 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M011, M066 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M107 · Manita AHORA (on-demand urgente)
- **Problema:** Emergencias (plomería/cerrajería) no resueltas al momento.
- **Solución:** Dispatching en tiempo real con pros que aceptan; ETA en mapa.
- **Beneficio:** Categoría premium diferenciadora.
- **Área:** CORE · **Prioridad:** P2 · **Impacto:** 8 · **Esfuerzo:** 8 · **ROI:** Alto · **Riesgo:** Alto · **Deps:** M030, M035, M057 · **Tiempo:** 4 sem · **Decisión:** BUILD

### M108 · Agenda inteligente ruteada para pros
- **Problema:** Huecos muertos entre citas.
- **Solución:** IA ofrece servicios cercanos que optimizan ruta/tiempo.
- **Beneficio:** +ingresos por pro; retención de oferta.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 7 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M030, M057 · **Tiempo:** 3 sem · **Decisión:** BUILD

### M109 · Números proxy (llamada enmascarada)
- **Problema:** Contacto fuera de plataforma; privacidad.
- **Solución:** Twilio con números proxy.
- **Beneficio:** Privacidad y retención de transacción.
- **Área:** CHAT · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M035 · **Tiempo:** 3 d · **Decisión:** BUILD

### M110 · Verificación biométrica / antecedentes
- **Problema:** INE básico insuficiente para categorías sensibles.
- **Solución:** KYC + verificación de antecedentes vía proveedor MX.
- **Beneficio:** Seguridad premium.
- **Área:** TRUST · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M038 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M111 · Seguro de servicio integrado
- **Problema:** Daños en casa sin cobertura.
- **Solución:** Alianza con aseguradora; cobertura por servicio.
- **Beneficio:** Diferenciador de confianza.
- **Área:** TRUST · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 6 · **ROI:** Medio · **Riesgo:** Alto · **Deps:** M011 · **Tiempo:** 4 sem · **Decisión:** BUILD

### M112 · Asistente IA que agenda por chat
- **Problema:** Coordinar horarios es tedioso.
- **Solución:** Asistente conversacional que propone/agenda.
- **Beneficio:** Fricción mínima.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 6 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M035, M030 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M113 · Mapa de calor de demanda para pros
- **Problema:** Pros no saben dónde hay trabajo.
- **Solución:** Visualización de demanda por zona/categoría.
- **Beneficio:** Mejor distribución de oferta.
- **Área:** ANLY · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M094, M057 · **Tiempo:** 3 d · **Decisión:** BUILD

### M114 · Reseñas en video verificadas
- **Problema:** Reseñas de texto poco creíbles.
- **Solución:** Reseñas en video con moderación.
- **Beneficio:** Confianza y contenido de marketing.
- **Área:** TRUST · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M034, M086 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M115 · Video-diagnóstico previo
- **Problema:** Cotizar requiere visita.
- **Solución:** Videollamada corta pro-cliente para estimar.
- **Beneficio:** Menos visitas inútiles.
- **Área:** CHAT · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M035 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M116 · Reagenda automática por clima/tráfico
- **Problema:** Servicios exteriores fallan por clima.
- **Solución:** Integración datos externos + reagenda proactiva.
- **Beneficio:** Menos cancelaciones.
- **Área:** RES · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 4 · **ROI:** Bajo · **Riesgo:** Medio · **Deps:** M030 · **Tiempo:** 3 d · **Decisión:** BUILD

### M117 · Manita Empresas (B2B + CFDI)
- **Problema:** Empresas necesitan servicios deducibles.
- **Solución:** Cuentas empresa + facturación CFDI (SAT).
- **Beneficio:** Segmento B2B de alto valor.
- **Área:** MON · **Prioridad:** P2 · **Impacto:** 7 · **Esfuerzo:** 7 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M011, M068 · **Tiempo:** 4 sem · **Decisión:** BUILD

### M118 · Manita para edificios/administradores
- **Problema:** Servicios recurrentes de condominios.
- **Solución:** Panel para admins con contratos y volumen.
- **Beneficio:** B2B2C recurrente.
- **Área:** MON · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 7 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M117 · **Tiempo:** 4 sem · **Decisión:** BUILD

### M119 · Wallet / créditos internos
- **Problema:** Sin saldo ni créditos (referidos, reembolsos).
- **Solución:** Wallet con saldo y movimientos.
- **Beneficio:** Retención y flexibilidad.
- **Área:** MON · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M011, M064 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M120 · Pago diferido (BNPL) para servicios caros
- **Problema:** Servicios de alto ticket frenan compra.
- **Solución:** Integración BNPL/mensualidades.
- **Beneficio:** Ticket promedio mayor.
- **Área:** MON · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 6 · **ROI:** Medio · **Riesgo:** Alto · **Deps:** M011 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M121 · Promociones y cupones
- **Problema:** Sin herramientas de adquisición/reactivación.
- **Solución:** Motor de cupones con reglas.
- **Beneficio:** Growth y reactivación.
- **Área:** GROW · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M011, M068 · **Tiempo:** 4 d · **Decisión:** BUILD

### M122 · Gamificación de pros (niveles, badges reales)
- **Problema:** Sin incentivos de calidad para pros.
- **Solución:** Niveles por desempeño real con beneficios.
- **Beneficio:** Calidad y retención de oferta.
- **Área:** RET · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M105 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M123 · Segmentación y CRM
- **Problema:** Sin segmentos para marketing.
- **Solución:** Segmentación por comportamiento + CRM.
- **Beneficio:** Campañas efectivas.
- **Área:** GROW · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M065, M094 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M124 · A/B testing framework
- **Problema:** Optimización sin experimentación.
- **Solución:** Feature flags + experimentos.
- **Beneficio:** Mejora continua medible.
- **Área:** ANLY · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M047 · **Tiempo:** 4 d · **Decisión:** BUILD

### M125 · App nativa (Expo/React Native)
- **Problema:** Sin app móvil real.
- **Solución:** App con Expo reusando Supabase.
- **Beneficio:** Retención y push nativo.
- **Área:** PWA · **Prioridad:** P2 · **Impacto:** 8 · **Esfuerzo:** 9 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M042, M045 · **Tiempo:** 6-8 sem · **Decisión:** BUILD

### M126 · ASO (App Store Optimization)
- **Problema:** App sin optimización de tienda.
- **Solución:** Fichas, keywords, screenshots optimizados.
- **Beneficio:** Descargas orgánicas.
- **Área:** GROW · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M125 · **Tiempo:** 2 d · **Decisión:** BUILD

### M127 · Onboarding móvil nativo
- **Problema:** Onboarding no adaptado a app.
- **Solución:** Flujo nativo con permisos (ubicación, notif).
- **Beneficio:** Activación móvil.
- **Área:** PWA · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M125 · **Tiempo:** 3 d · **Decisión:** BUILD

### M128 · Deep links / universal links
- **Problema:** Compartir no abre en app.
- **Solución:** Deep links web↔app.
- **Beneficio:** Continuidad de experiencia.
- **Área:** PWA · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M125, M044 · **Tiempo:** 2 d · **Decisión:** BUILD

### M129 · Portafolio de trabajos del pro (antes/después)
- **Problema:** Sin evidencia visual de calidad.
- **Solución:** Galería con fotos de trabajos.
- **Beneficio:** Conversión y confianza.
- **Área:** PRO · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M031, M029 · **Tiempo:** 3 d · **Decisión:** BUILD

### M130 · Certificaciones y credenciales verificadas
- **Problema:** Sin forma de mostrar títulos/certificados.
- **Solución:** Subida y verificación de credenciales.
- **Beneficio:** Diferenciación de pros.
- **Área:** TRUST · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M038 · **Tiempo:** 3 d · **Decisión:** BUILD

### M131 · Multi-servicio por profesional
- **Problema:** Un pro ofrece un solo servicio.
- **Solución:** Varios servicios/precios por pro.
- **Beneficio:** Más oferta y matches.
- **Área:** PRO · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M025 · **Tiempo:** 3 d · **Decisión:** REDESIGN

### M132 · Paquetes de servicios (bundles)
- **Problema:** Sin ofertas combinadas.
- **Solución:** Paquetes (ej. limpieza + ventanas).
- **Beneficio:** Ticket mayor.
- **Área:** MON · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M131 · **Tiempo:** 3 d · **Decisión:** BUILD

### M133 · Propinas al profesional
- **Problema:** Sin forma de premiar buen servicio.
- **Solución:** Propina opcional post-servicio.
- **Beneficio:** Ingreso extra al pro; satisfacción.
- **Área:** PAY · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M037 · **Tiempo:** 1 d · **Decisión:** BUILD

### M134 · Recordatorios de servicio (calendario)
- **Problema:** Olvidos de citas.
- **Solución:** Recordatorios + añadir a calendario.
- **Beneficio:** Menos no-shows.
- **Área:** RET · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M033 · **Tiempo:** 1 d · **Decisión:** BUILD

### M135 · Encuesta NPS y feedback
- **Problema:** Sin medición de satisfacción.
- **Solución:** NPS post-servicio + análisis.
- **Beneficio:** Mejora guiada por clientes.
- **Área:** ANLY · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M034 · **Tiempo:** 1 d · **Decisión:** BUILD

### M136 · Respuesta del pro a reseñas
- **Problema:** Reseñas unidireccionales.
- **Solución:** Réplica pública del pro.
- **Beneficio:** Confianza y contexto.
- **Área:** TRUST · **Prioridad:** P2 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M034 · **Tiempo:** 1 d · **Decisión:** BUILD

### M137 · Disputas y resolución
- **Problema:** Sin flujo formal de disputa.
- **Solución:** Centro de disputas ligado a escrow.
- **Beneficio:** Confianza en la garantía.
- **Área:** TRUST · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M012, M036 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M138 · Panel financiero del profesional
- **Problema:** Pro no ve sus ingresos/payouts.
- **Solución:** Dashboard de ganancias y pagos.
- **Beneficio:** Transparencia y retención de oferta.
- **Área:** PRO · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M037 · **Tiempo:** 3 d · **Decisión:** BUILD

### M139 · Búsqueda por voz
- **Problema:** Fricción de tecleo en móvil.
- **Solución:** Entrada por voz en buscador.
- **Beneficio:** Accesibilidad y comodidad.
- **Área:** UX · **Prioridad:** P2 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M104 · **Tiempo:** 2 d · **Decisión:** BUILD

### M140 · Chat con IA de soporte (deflection)
- **Problema:** Soporte no escala.
- **Solución:** Bot IA que resuelve dudas comunes.
- **Beneficio:** Menos costo de soporte.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M070 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M141 · Moderación IA de contenido/fotos
- **Problema:** Moderación manual no escala.
- **Solución:** Clasificadores automáticos + revisión.
- **Beneficio:** Seguridad a escala.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M086 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M142 · Detección de fraude con ML
- **Problema:** Reglas insuficientes a escala.
- **Solución:** Modelos de anomalías.
- **Beneficio:** Menos fraude/pérdidas.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 6 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M095 · **Tiempo:** 2 sem · **Decisión:** BUILD

### M143 · Predicción de churn y reactivación
- **Problema:** Se pierde a usuarios sin aviso.
- **Solución:** Modelo de churn + campañas.
- **Beneficio:** Retención.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M094, M123 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M144 · Landing pages por campaña
- **Problema:** Tráfico pagado sin landings específicas.
- **Solución:** LPs por campaña/keyword.
- **Beneficio:** Mejor conversión de ads.
- **Área:** GROW · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M042, M124 · **Tiempo:** 3 d · **Decisión:** BUILD

### M145 · Integración redes sociales / contenido
- **Problema:** Sin presencia social conectada.
- **Solución:** Compartir automático, feeds, UGC.
- **Beneficio:** Alcance orgánico.
- **Área:** GROW · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M069 · **Tiempo:** 3 d · **Decisión:** BUILD

### M146 · SEO local (Google Business, mapas)
- **Problema:** Sin presencia en mapas locales.
- **Solución:** Perfiles locales + citations.
- **Beneficio:** Descubrimiento local.
- **Área:** SEO · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M043 · **Tiempo:** 3 d · **Decisión:** BUILD

### M147 · Optimización de conversión (CRO) iterativa
- **Problema:** Conversión sin optimizar sistemáticamente.
- **Solución:** Programa CRO con experimentos.
- **Beneficio:** Más reservas por visita.
- **Área:** GROW · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M124, M047 · **Tiempo:** ongoing · **Decisión:** BUILD

### M148 · Community / red de pros
- **Problema:** Pros aislados; sin sentido de comunidad.
- **Solución:** Foro/recursos/formación para pros.
- **Beneficio:** Retención de oferta.
- **Área:** RET · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M122 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M149 · Multi-ciudad (arquitectura de expansión)
- **Problema:** Diseño solo para CDMX.
- **Solución:** Modelo de datos y UX multi-ciudad.
- **Beneficio:** Expansión geográfica.
- **Área:** SCALE · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M057 · **Tiempo:** 1 sem · **Decisión:** REDESIGN

### M150 · Caché de disponibilidad (Redis)
- **Problema:** Consultas de disponibilidad pesadas a escala.
- **Solución:** Capa de caché.
- **Beneficio:** Latencia y coste.
- **Área:** SCALE · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M030 · **Tiempo:** 3 d · **Decisión:** BUILD

### M151 · Geoindexación con PostGIS
- **Problema:** Búsqueda por proximidad no optimizada.
- **Solución:** PostGIS + índices espaciales.
- **Beneficio:** Búsqueda geo eficiente.
- **Área:** SCALE · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M057 · **Tiempo:** 3 d · **Decisión:** BUILD

### M152 · CDN global para assets
- **Problema:** Assets sin distribución global.
- **Solución:** CDN (Cloudflare/Bunny) para estáticos e imágenes.
- **Beneficio:** Rendimiento global.
- **Área:** SCALE · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M054 · **Tiempo:** 2 d · **Decisión:** BUILD

### M153 · Colas para trabajos async
- **Problema:** Notif/payouts/IA bloquean flujos.
- **Solución:** Colas (pg-boss/SQS) para jobs.
- **Beneficio:** Robustez y escala.
- **Área:** SCALE · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M026, M037 · **Tiempo:** 4 d · **Decisión:** BUILD

### M154 · Observabilidad completa (tracing, alertas, SLOs)
- **Problema:** Sin métricas ni alertas de sistema.
- **Solución:** Tracing + dashboards + alertas + SLOs.
- **Beneficio:** Operación confiable.
- **Área:** SCALE · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M071 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M155 · Facturación automatizada e integración contable
- **Problema:** Facturación manual no escala.
- **Solución:** Automatizar CFDI y conciliación.
- **Beneficio:** Operación financiera escalable.
- **Área:** MON · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 5 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M117 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M156 · Panel de administración interno
- **Problema:** Gestión manual vía SQL.
- **Solución:** Admin para usuarios, pros, reservas, disputas.
- **Beneficio:** Operación eficiente.
- **Área:** ARCH · **Prioridad:** P2 · **Impacto:** 6 · **Esfuerzo:** 5 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M008, M156-deps · **Tiempo:** 1 sem · **Decisión:** BUILD

### M157 · Roles y permisos (RBAC)
- **Problema:** Sin roles (admin, soporte, pro, cliente).
- **Solución:** RBAC en DB y app.
- **Beneficio:** Seguridad operativa.
- **Área:** SEG · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M003 · **Tiempo:** 3 d · **Decisión:** BUILD

### M158 · Exportar datos / portabilidad (derechos ARCO)
- **Problema:** Sin ejercicio de derechos de datos.
- **Solución:** Exportar/eliminar datos del usuario.
- **Beneficio:** Cumplimiento LFPDPPP.
- **Área:** LEGAL · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M059 · **Tiempo:** 3 d · **Decisión:** BUILD

### M159 · Accesibilidad avanzada (auditoría con usuarios)
- **Problema:** A11Y validada solo con herramientas.
- **Solución:** Pruebas con usuarios de tecnologías asistivas.
- **Beneficio:** Accesibilidad real.
- **Área:** A11Y · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M051 · **Tiempo:** ongoing · **Decisión:** BUILD

### M160 · Modo oscuro
- **Problema:** Solo tema claro.
- **Solución:** Dark mode con tokens.
- **Beneficio:** Preferencia de usuario.
- **Área:** UX · **Prioridad:** P2 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M100 · **Tiempo:** 2 d · **Decisión:** BUILD

### M161 · Onboarding interactivo (tour de producto)
- **Problema:** Usuarios nuevos sin guía.
- **Solución:** Tour contextual en primeros usos.
- **Beneficio:** Activación.
- **Área:** UX · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M084 · **Tiempo:** 2 d · **Decisión:** BUILD

### M162 · Comparador de profesionales
- **Problema:** Difícil comparar opciones.
- **Solución:** Vista comparativa lado a lado.
- **Beneficio:** Decisión más fácil.
- **Área:** CORE · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M076 · **Tiempo:** 2 d · **Decisión:** BUILD

### M163 · Disponibilidad en tiempo real (Realtime)
- **Problema:** Disponibilidad no se actualiza en vivo.
- **Solución:** Realtime en slots/estado.
- **Beneficio:** Menos choques de reserva.
- **Área:** CORE · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Medio · **Deps:** M030, M150 · **Tiempo:** 3 d · **Decisión:** BUILD

### M164 · Recomendación de servicios complementarios
- **Problema:** Sin cross-sell.
- **Solución:** Sugerencias post-reserva ("¿también ventanas?").
- **Beneficio:** Ticket y frecuencia.
- **Área:** IA · **Prioridad:** P2 · **Impacto:** 4 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M103 · **Tiempo:** 3 d · **Decisión:** BUILD

### M165 · Programa de fidelidad / recompensas
- **Problema:** Sin incentivo a la recurrencia.
- **Solución:** Puntos/beneficios por uso.
- **Beneficio:** Retención.
- **Área:** RET · **Prioridad:** P2 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M119 · **Tiempo:** 1 sem · **Decisión:** BUILD

---

## BLOQUE P3 — Pulido, nice-to-have y optimizaciones finas (M166–M200)

### M166 · Animaciones y microinteracciones
- **Problema:** UI estática, poco deleite.
- **Solución:** Transiciones sutiles y feedback de acciones.
- **Beneficio:** Percepción premium.
- **Área:** UX · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M100 · **Tiempo:** 3 d · **Decisión:** BUILD

### M167 · Ilustraciones/branding visual propio
- **Problema:** Emojis como visuales principales.
- **Solución:** Sistema ilustrativo propio.
- **Beneficio:** Marca distintiva.
- **Área:** BRAND · **Prioridad:** P3 · **Impacto:** 4 · **Esfuerzo:** 4 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M093 · **Tiempo:** 1 sem · **Decisión:** REDESIGN

### M168 · Skeleton screens refinados
- **Problema:** Loading básico.
- **Solución:** Skeletons por componente.
- **Beneficio:** Percepción de velocidad.
- **Área:** UX · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M018 · **Tiempo:** 1 d · **Decisión:** BUILD

### M169 · Compartir reseña en redes
- **Problema:** Reseñas no se difunden.
- **Solución:** Compartir reseña con imagen generada.
- **Beneficio:** Prueba social externa.
- **Área:** GROW · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M114 · **Tiempo:** 2 d · **Decisión:** BUILD

### M170 · Widget "servicios cerca de ti" en home
- **Problema:** Home no personaliza por ubicación.
- **Solución:** Sección geo-personalizada.
- **Beneficio:** Relevancia.
- **Área:** CORE · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M057 · **Tiempo:** 1 d · **Decisión:** BUILD

### M171 · Historial de búsquedas recientes
- **Problema:** Sin memoria de búsquedas.
- **Solución:** Guardar y sugerir recientes.
- **Beneficio:** Comodidad.
- **Área:** UX · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 1 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M059 · **Tiempo:** 0.5 d · **Decisión:** BUILD

### M172 · Sugerencias de autocompletado en búsqueda
- **Problema:** Búsqueda sin ayudas.
- **Solución:** Autocomplete de servicios/zonas.
- **Beneficio:** Menos fricción.
- **Área:** UX · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M058 · **Tiempo:** 2 d · **Decisión:** BUILD

### M173 · Exportar reservas a calendario (iCal)
- **Problema:** Sin sincronía con calendarios personales.
- **Solución:** Exportar iCal/Google Calendar.
- **Beneficio:** Organización.
- **Área:** RET · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M134 · **Tiempo:** 1 d · **Decisión:** BUILD

### M174 · Traducción a inglés (turistas/expats)
- **Problema:** Solo español.
- **Solución:** EN como segundo idioma.
- **Beneficio:** Segmento expat CDMX.
- **Área:** GROW · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M083 · **Tiempo:** 3 d · **Decisión:** BUILD

### M175 · Accesos rápidos (shortcuts) y command palette
- **Problema:** Navegación lenta para power users.
- **Solución:** Atajos y paleta de comandos.
- **Beneficio:** Eficiencia.
- **Área:** UX · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 3 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M100 · **Tiempo:** 2 d · **Decisión:** BUILD

### M176 · Personalización de home por historial
- **Problema:** Home igual para todos.
- **Solución:** Contenido según uso.
- **Beneficio:** Relevancia y recompra.
- **Área:** IA · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 4 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M103 · **Tiempo:** 3 d · **Decisión:** BUILD

### M177 · Badges de temporada / campañas visuales
- **Problema:** Sin dinamismo estacional.
- **Solución:** Temas por temporada.
- **Beneficio:** Frescura de marca.
- **Área:** BRAND · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M100 · **Tiempo:** 1 d · **Decisión:** BUILD

### M178 · Sonidos/haptics de confirmación (app)
- **Problema:** Falta feedback sensorial en app.
- **Solución:** Haptics y sonidos sutiles.
- **Beneficio:** Deleite.
- **Área:** PWA · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M125 · **Tiempo:** 1 d · **Decisión:** BUILD

### M179 · Widget de resumen para el pro (home móvil)
- **Problema:** Pro sin vistazo rápido.
- **Solución:** Widget de próximas citas/ingresos.
- **Beneficio:** Comodidad del pro.
- **Área:** PRO · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M138 · **Tiempo:** 2 d · **Decisión:** BUILD

### M180 · Integración con asistentes (Siri/Google)
- **Problema:** Sin acciones por voz externas.
- **Solución:** Shortcuts/App Actions.
- **Beneficio:** Conveniencia.
- **Área:** PWA · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 4 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M125 · **Tiempo:** 3 d · **Decisión:** BUILD

### M181 · Estados de "escribiendo" y recibos de lectura (chat)
- **Problema:** Chat básico sin señales.
- **Solución:** Typing indicators y read receipts.
- **Beneficio:** Comunicación más rica.
- **Área:** CHAT · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M035 · **Tiempo:** 1 d · **Decisión:** BUILD

### M182 · Adjuntar fotos en chat
- **Problema:** Chat solo texto.
- **Solución:** Adjuntos con moderación.
- **Beneficio:** Coordinación visual.
- **Área:** CHAT · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M035, M141 · **Tiempo:** 2 d · **Decisión:** BUILD

### M183 · Plantillas de mensajes para pros
- **Problema:** Pros escriben lo mismo repetidamente.
- **Solución:** Respuestas rápidas guardadas.
- **Beneficio:** Eficiencia del pro.
- **Área:** CHAT · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M035 · **Tiempo:** 1 d · **Decisión:** BUILD

### M184 · Etiquetas/tags de servicios
- **Problema:** Descubrimiento limitado a categorías.
- **Solución:** Tags libres buscables.
- **Beneficio:** Descubrimiento fino.
- **Área:** CORE · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M058 · **Tiempo:** 2 d · **Decisión:** BUILD

### M185 · Vista de mapa de profesionales
- **Problema:** Solo lista.
- **Solución:** Mapa con pros por zona.
- **Beneficio:** Exploración geográfica.
- **Área:** CORE · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 4 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M151 · **Tiempo:** 3 d · **Decisión:** BUILD

### M186 · Calculadora de presupuesto por servicio
- **Problema:** Cliente sin idea de costo total.
- **Solución:** Estimador interactivo.
- **Beneficio:** Transparencia.
- **Área:** UX · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M102 · **Tiempo:** 2 d · **Decisión:** BUILD

### M187 · Recordatorio de mantenimiento recurrente
- **Problema:** Cliente olvida servicios periódicos.
- **Solución:** Sugerir "toca limpieza otra vez".
- **Beneficio:** Recurrencia.
- **Área:** RET · **Prioridad:** P3 · **Impacto:** 4 · **Esfuerzo:** 2 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M065 · **Tiempo:** 1 d · **Decisión:** BUILD

### M188 · Regalar servicios (gift cards)
- **Problema:** Sin opción de regalo.
- **Solución:** Gift cards de servicios.
- **Beneficio:** Nuevo canal de adquisición.
- **Área:** MON · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 4 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M119 · **Tiempo:** 3 d · **Decisión:** BUILD

### M189 · Verificación de reseñas con foto del servicio
- **Problema:** Reseñas sin evidencia.
- **Solución:** Adjuntar foto del resultado.
- **Beneficio:** Confianza extra.
- **Área:** TRUST · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M034 · **Tiempo:** 1 d · **Decisión:** BUILD

### M190 · Filtro por idioma del profesional
- **Problema:** No se filtra por idioma.
- **Solución:** Campo idioma + filtro.
- **Beneficio:** Match para expats.
- **Área:** CORE · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M076 · **Tiempo:** 1 d · **Decisión:** BUILD

### M191 · Accesibilidad: soporte de reduce-motion
- **Problema:** Animaciones sin respeto a preferencias.
- **Solución:** `prefers-reduced-motion`.
- **Beneficio:** Accesibilidad.
- **Área:** A11Y · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 1 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M166 · **Tiempo:** 0.5 d · **Decisión:** FIX

### M192 · Optimización de imágenes on-the-fly
- **Problema:** Imágenes servidas sin transformación dinámica.
- **Solución:** Transformación por CDN (resize/format).
- **Beneficio:** Rendimiento fino.
- **Área:** PERF · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M152 · **Tiempo:** 1 d · **Decisión:** BUILD

### M193 · Prefetch/prerender de rutas frecuentes
- **Problema:** Navegación con latencia.
- **Solución:** Prefetch de enlaces visibles.
- **Beneficio:** Navegación instantánea.
- **Área:** PERF · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** 1 d · **Decisión:** BUILD

### M194 · Documentación técnica y de API interna
- **Problema:** Sin docs de RPCs/estructura.
- **Solución:** Documentar endpoints, RPCs y modelos.
- **Beneficio:** Onboarding de devs.
- **Área:** ARCH · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 3 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M042 · **Tiempo:** ongoing · **Decisión:** BUILD

### M195 · Panel de estado (status page)
- **Problema:** Sin comunicación de incidentes.
- **Solución:** Status page pública.
- **Beneficio:** Transparencia operativa.
- **Área:** SCALE · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M154 · **Tiempo:** 1 d · **Decisión:** BUILD

### M196 · Encuesta de abandono (exit intent)
- **Problema:** No se sabe por qué se van.
- **Solución:** Micro-encuesta al abandonar.
- **Beneficio:** Insights de fricción.
- **Área:** ANLY · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 2 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M047 · **Tiempo:** 1 d · **Decisión:** BUILD

### M197 · Recompensa por primera reseña
- **Problema:** Pocas reseñas al inicio.
- **Solución:** Incentivo por reseñar.
- **Beneficio:** Semilla de reputación.
- **Área:** GROW · **Prioridad:** P3 · **Impacto:** 3 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M034, M119 · **Tiempo:** 1 d · **Decisión:** BUILD

### M198 · Perfil verificado con insignia animada
- **Problema:** Verificación poco visible.
- **Solución:** Insignia destacada.
- **Beneficio:** Confianza percibida.
- **Área:** TRUST · **Prioridad:** P3 · **Impacto:** 2 · **Esfuerzo:** 1 · **ROI:** Bajo · **Riesgo:** Bajo · **Deps:** M038 · **Tiempo:** 0.5 d · **Decisión:** BUILD

### M199 · Integración con WhatsApp (notificaciones)
- **Problema:** Email/push pueden no alcanzar en MX.
- **Solución:** Notificaciones por WhatsApp Business API.
- **Beneficio:** Canal preferido en México.
- **Área:** RET · **Prioridad:** P3 · **Impacto:** 5 · **Esfuerzo:** 4 · **ROI:** Alto · **Riesgo:** Medio · **Deps:** M033 · **Tiempo:** 1 sem · **Decisión:** BUILD

### M200 · Reseñas destacadas en home (prueba social real)
- **Problema:** Tras M004 no hay prueba social.
- **Solución:** Mostrar reseñas reales verificadas en home.
- **Beneficio:** Confianza con datos reales.
- **Área:** GROW · **Prioridad:** P3 · **Impacto:** 4 · **Esfuerzo:** 2 · **ROI:** Medio · **Riesgo:** Bajo · **Deps:** M016, M034 · **Tiempo:** 1 d · **Decisión:** BUILD

> **Nota sobre M199 (WhatsApp):** aunque es P3 por dependencia y complejidad de aprobación de API, su impacto en retención en México es alto; considerar adelantarlo a P2 una vez validado el canal.

---

# LISTAS TOP

## Top 20 absolutamente críticas
1. M002 · RLS precio server-side
2. M011 · Pagos con escrow
3. M007 · Máquina de estados de reserva
4. M006 · Policy pro-ve-reservas
5. M003 · Bloquear auto-edición verified/rating
6. M009 · Reseñas verificadas
7. M012 · Webhooks de pago → estado
8. M004 · Eliminar datos falsos (legal)
9. M001 · Config Auth URL Netlify
10. M008 · Panel del profesional
11. M037 · Payout al profesional
12. M013 · Header/footer componentizados
13. M038 · Verificación de identidad (INE)
14. M010 · Trigger de rating real
15. M026 · Notificación de reserva al pro
16. M023 · Aviso de privacidad/términos
17. M035 · Chat cliente↔profesional
18. M015 · Guard de sesión consistente
19. M019 · Fuente única de datos
20. M073 · Validación/sanitización de inputs

## Top 20 con mayor ROI (impacto/esfuerzo)
1. M001 · Auth URL Netlify (10 min)
2. M004 · Eliminar datos falsos (2 h)
3. M027 · Pin de versión Supabase
4. M013 · Header componentizado
5. M046 · Analítica de producto
6. M055 · Preconnect de fuentes
7. M078 · Índices de DB
8. M039 · SEO meta/OG/canonical
9. M068 · Take rate configurable
10. M002 · RLS precio server-side
11. M014 · Matar href="#"
12. M066 · Reservar de nuevo (1-tap)
13. M043 · Páginas categoría×zona
14. M069 · Web Share
15. M006 · Policy pro-ve-reservas
16. M152 · CDN para assets
17. M047 · Embudo instrumentado
18. M018 · Manejo de error/carga
19. M187 · Recordatorio de recurrencia
20. M060 · Direcciones guardadas

## Top 20 que más aumentan la conversión
1. M011 · Pagos (cierra el flujo)
2. M028 · Confirmación de reserva real
3. M084 · Buscar sin registro
4. M075 · Login social + magic link
5. M060 · Direcciones guardadas
6. M030 · Disponibilidad real
7. M017 · Reemplazar alert/prompt
8. M018 · Estados de carga/error
9. M032 · Avatares/fotos reales
10. M101 · Reserva por foto (IA)
11. M076 · Filtros de precio/rating
12. M089 · Mobile-first fixes
13. M061 · Desglose de precio
14. M103 · Recomendaciones
15. M097 · Perfil pro optimizado
16. M052 · Rediseño de hero
17. M162 · Comparador de pros
18. M121 · Promociones/cupones
19. M172 · Autocompletado de búsqueda
20. M147 · CRO iterativo

## Top 20 que más aumentan la retención
1. M106 · Manita Plus (suscripción)
2. M066 · Reservar de nuevo
3. M065 · Email lifecycle
4. M096 · Notificaciones push
5. M199 · Notificaciones WhatsApp
6. M067 · Favoritos
7. M187 · Recordatorio de recurrencia
8. M035 · Chat
9. M033 · Notif de estado al cliente
10. M064 · Referidos
11. M165 · Programa de fidelidad
12. M134 · Recordatorios de servicio
13. M119 · Wallet/créditos
14. M143 · Predicción de churn
15. M059 · Perfil de cliente
16. M063 · Mis reservas enriquecido
17. M122 · Gamificación de pros
18. M148 · Comunidad de pros
19. M123 · Segmentación/CRM
20. M164 · Cross-sell complementario

## Top 20 que crean ventaja competitiva
1. M101 · Reserva por foto (IA)
2. M102 · Pricing inteligente
3. M107 · Manita AHORA (on-demand)
4. M106 · Manita Plus
5. M105 · Trust score dinámico
6. M009+M038 · Reputación verificada anti-fraude
7. M108 · Agenda inteligente ruteada
8. M111 · Seguro de servicio
9. M117 · Manita Empresas (CFDI)
10. M110 · Verificación biométrica/antecedentes
11. M103 · Motor de recomendaciones
12. M104 · Búsqueda semántica
13. M112 · Asistente IA que agenda
14. M114 · Reseñas en video
15. M118 · Manita para edificios
16. M115 · Video-diagnóstico
17. M199 · WhatsApp nativo
18. M120 · BNPL
19. M113 · Mapa de calor de demanda
20. M116 · Reagenda por clima/tráfico

## Top 20 técnicas
1. M002 · RPC de reserva
2. M042 · Migración a Astro
3. M019 · Fuente única de datos
4. M078 · Índices de DB
5. M058 · Búsqueda FTS
6. M080 · Entornos dev/staging/prod
7. M081 · CI/CD
8. M082 · Tests e2e
9. M071 · Logging/Sentry
10. M153 · Colas async
11. M154 · Observabilidad/SLOs
12. M150 · Caché Redis
13. M151 · PostGIS
14. M152 · CDN
15. M157 · RBAC
16. M072 · Rate limiting
17. M079 · Backups
18. M012 · Webhooks de pago
19. M099 · Core Web Vitals monitoring
20. M027 · Pin de dependencias

## Las 10 cosas que NO debemos construir (todavía o nunca)
1. **App nativa antes del MVP transaccional** — PWA (M045) primero; nativa (M125) solo con tracción.
2. **IA propia de visión desde cero** — para M101 usar APIs existentes; no entrenar modelos propios sin datos.
3. **Auto-lectura/scraping de datos de terceros** — riesgo legal; nada de copiar catálogos ajenos.
4. **Gamificación de clientes (XP/badges tipo Duolingo)** — no encaja en servicios a domicilio; distrae del core transaccional.
5. **Chat de video propio (WebRTC desde cero)** — usar proveedor si se necesita (M115), no infra propia.
6. **BNPL propio / fintech interna** — usar proveedor (M120); no construir crédito propio.
7. **Multi-país prematuro** — dominar CDMX antes de i18n/expansión agresiva.
8. **Feed social / red social de servicios** — no es el producto; dispersa foco.
9. **Marketplace de productos físicos** — Manita es servicios; no derivar a e-commerce.
10. **Panel de BI custom pesado** — usar herramientas existentes (Metabase/Plausible) en vez de construir dashboards a medida temprano.

---

# ORDEN DE EJECUCIÓN RECOMENDADO

> Ordenado por dependencias reales. Ningún item se ejecuta antes de aquello de lo que depende.

## Fase 0 — Apagar riesgos (días)
Objetivo: eliminar riesgo legal y de seguridad inmediato, sin construir features nuevas.
- M001 (Auth URL) · M004 (datos falsos) · M005 (reviews/badges falsos) · M027 (pin deps)
- M002 (RLS precio) · M003 (verified/rating) · M006 (policy pro-reservas)

## Fase 1 — Seguridad y foundations (2-3 semanas)
Objetivo: base técnica sólida para construir sin deuda.
- M013 (componentizar) → M014, M015, M017, M018
- M019 (fuente única) → M020 → M021 → M022
- M023 (legal) · M024 (teléfono) · M025 (precio) · M073 (validación) · M071 (logging)
- M007 (estados de reserva) · M008 (panel pro) · M028 (confirmación) · M026 (notif pro)

## Fase 2 — Marketplace transaccional (1-2 meses)
Objetivo: que Manita **cobre y opere** de verdad.
- M011 (pagos) → M012 (webhooks) → M037 (payout) → M068 (take rate) → M062 (recibos)
- M030 (disponibilidad) · M036 (cancelación) · M061 (desglose) · M060 (direcciones) · M059 (perfil cliente)
- M009 (reseñas) → M010 (rating real) → M016 (reseñas reales) → M034 (UI reseña)
- M029 (onboarding pro) · M031 (storage) · M032 (avatares) · M033 (notif cliente) · M063 (mis reservas)

## Fase 3 — Confianza y operación (3-4 semanas)
Objetivo: seguridad de la comunidad y calidad operativa.
- M038 (INE) → M086 (moderación) → M087 (reportar) → M137 (disputas)
- M035 (chat) → M109 (números proxy)
- M070 (soporte) · M095 (fraude reglas) · M072 (rate limit) · M074 (email confirm) · M075 (login social)
- M080 (entornos) · M081 (CI/CD) · M082 (tests) · M078 (índices) · M079 (backups) · M156/M157 (admin/RBAC)

## Fase 4 — Growth (1-2 meses)
Objetivo: adquisición, conversión y retención medibles.
- M046 (analítica) → M047 (funnel) → M094 (métricas negocio) → M124 (A/B) → M147 (CRO)
- M039 (SEO meta) → M040 (JSON-LD) → M041 (sitemap) → M042 (Astro) → M043 (categoría×zona) → M044 (slugs) → M097 (perfil SEO) → M098 (blog) → M146 (SEO local)
- M045 (PWA) → M096 (push) → M199 (WhatsApp)
- M064 (referidos) · M065 (lifecycle) · M066 (recompra) · M067 (favoritos) · M121 (cupones) · M069 (share)
- M048–M051 (accesibilidad) · M052 (hero) · M053 (copy) · M054/M055/M056 (perf) · M089/M090 (mobile) · M100 (design system)

## Fase 5 — IA / Diferenciación (2-3 meses)
Objetivo: construir el moat competitivo.
- M101 (reserva por foto) · M102 (pricing IA) · M103 (recomendaciones) · M104 (búsqueda semántica)
- M105 (trust score) · M106 (Manita Plus) · M107 (Manita AHORA) · M108 (agenda ruteada)
- M112 (asistente IA) · M140 (soporte IA) · M141 (moderación IA) · M110 (biometría) · M111 (seguro) · M114/M115 (video)

## Fase 6 — Escala (continuo, según tracción)
Objetivo: soportar millones y expandir monetización.
- M149 (multi-ciudad) · M150 (caché) · M151 (PostGIS) · M152 (CDN) · M153 (colas) · M154 (observabilidad)
- M117 (Empresas/CFDI) · M118 (edificios) · M119 (wallet) · M120 (BNPL) · M155 (facturación)
- M142 (fraude ML) · M143 (churn) · M125 (app nativa) → M126/M127/M128 · resto de P3 según impacto.

---

# CONTROL DE CONSISTENCIA (revisión del propio backlog)

Revisión realizada sobre dependencias, prioridades y ciclos:

- **Sin dependencias circulares:** cada item depende solo de IDs de fase igual o anterior (verificado M001→M200).
- **Corrección aplicada:** M016 y M034 dependían de reseñas reales pero se listaban antes de M009; reordenado para que M009 (P0) preceda. M200 (prueba social real) movido a P3 con deps M016/M034 para no reintroducir datos falsos eliminados en M004.
- **Ajuste de prioridad:** M199 (WhatsApp) marcado P3 por complejidad de aprobación de API, con nota de posible ascenso a P2 por su alto impacto de retención en México.
- **Dependencia implícita señalada:** M156 (admin) requiere entidades de fases previas (M008, M038, M137); se ejecuta en Fase 3, no antes.
- **Coherencia de decisiones:** los DELETE (M004, M005, M056) no tienen dependientes que rompan; M200 reconstruye prueba social solo con datos reales.
- **Foundations antes que features:** M013/M019 (P0) preceden a todo lo de SEO/Astro (M042) y UX, evitando rework.

**Estado:** backlog consistente y listo para convertirse en spec técnico ejecutable.

---

# ADENDA POST-VALIDACIÓN TÉCNICA (correcciones al backlog)

> Tras inspeccionar el estado real del proyecto (sin Edge Functions, sin migraciones, sin CLI, todo SQL manual y frontend estático por CDN), se detectan dependencias fundacionales faltantes. Se añaden como P0 y se ajustan dependencias.

### M201 · Setup Supabase: proyecto local, CLI y migraciones versionadas
- **Problema:** Todo el SQL vive en `supabase_schema.sql` monolítico ejecutado a mano en el editor web. No es reproducible ni versionable. RPCs, triggers y policies (M002, M003, M006, M007, M009, M010) necesitan migraciones controladas.
- **Solución:** Inicializar `supabase/` con CLI, mover el schema a `supabase/migrations/0001_init.sql`, y crear migraciones incrementales para cada cambio. Linkear proyecto remoto.
- **Beneficio:** Cambios de DB reproducibles, revisables y con rollback.
- **Área:** ARCH · **Prioridad:** P0 · **Impacto:** 8 · **Esfuerzo:** 3 · **ROI:** Muy Alto · **Riesgo:** Bajo · **Deps:** — · **Tiempo:** 1 d · **Decisión:** BUILD
- **NOTA:** Requiere Node.js/Supabase CLI. Si no está disponible en el entorno, el fallback es mantener migraciones como archivos `.sql` numerados en `supabase/migrations/` aplicados manualmente en orden, documentando cada uno. **No bloquea** el diseño del SQL, solo su método de despliegue.

### M202 · Estructura de Edge Functions + gestión de secretos
- **Problema:** M011 (pagos) y M012 (webhooks) requieren Edge Functions que no existen ni tienen dónde vivir; las claves de Stripe/MercadoPago no pueden estar en el cliente.
- **Solución:** Crear `supabase/functions/` con estructura base; configurar secrets (`supabase secrets set`) para claves de pago; función de health-check como plantilla.
- **Beneficio:** Base segura para pagos y webhooks server-side.
- **Área:** ARCH · **Prioridad:** P0 · **Impacto:** 7 · **Esfuerzo:** 3 · **ROI:** Alto · **Riesgo:** Bajo · **Deps:** M201 · **Tiempo:** 1 d · **Decisión:** BUILD

## Correcciones de dependencias aplicadas
- **M002, M003, M006, M007, M009, M010** ahora dependen también de **M201** (migraciones versionadas) como fundamento de despliegue de SQL.
- **M011, M012** ahora dependen de **M202** (estructura de Edge Functions + secrets), que a su vez depende de M201.
- **Orden de ejecución actualizado:** M201 y M202 se ejecutan al inicio de **Fase 1** (antes que cualquier RPC/policy/trigger), y M202 antes de Fase 2 (pagos).
- **Prioridad confirmada correcta:** el resto de dependencias de M001–M028 se validó contra el código real y son correctas. M001 (Auth URL) no bloquea el SQL y puede hacerse en paralelo en Fase 0.

## Riesgo de entorno documentado
- La `SUPABASE_KEY` en `supabase-client.js` es la **publishable/anon key** (correcto que sea pública). **Toda** la seguridad depende de RLS + RPCs `SECURITY DEFINER` + Edge Functions. No existe otra capa server. Esto hace M002/M003/M006 aún más críticos: son la única defensa.

---

# ADENDA FASE 1.5 — HARDENING DEL CORE (estado real de seguridad)

> Corrección de estado exigida: nada se declara "seguro" sin ejecución. Los tests corren contra **Postgres real (PGlite)**: 21/21 PASS. RLS y Storage quedan **PENDIENTES DE VALIDACIÓN EN SUPABASE** (PGlite no ejerce RLS como usuario final).

## Nuevos items añadidos al backlog (hardening)
- **M203 · Concurrencia anti doble-booking (constraint EXCLUDE):** P0 · Impacto 10 · Esf 4 · **VERIFICADO EN PGLITE** · Deps M201.
- **M204 · Disponibilidad real (availability + time_off):** P0 · Impacto 8 · Esf 5 · Deps M203.
- **M205 · Duración/buffer del servicio (start_at/end_at):** P0 · Impacto 7 · Esf 3 · Deps M203.
- **M206 · Snapshot de precio en reserva:** P0 · Impacto 7 · Esf 3 · **VERIFICADO EN PGLITE** · Deps M002.
- **M207 · Idempotencia de reservas (idempotency_key):** P0 · Impacto 7 · Esf 2 · **VERIFICADO EN PGLITE** · Deps M002.
- **M208 · Máquina financiera separada (payments/refunds/payouts):** P0 · Impacto 8 · Esf 4 · Deps M011.
- **M209 · Audit log de operaciones críticas:** P0 · Impacto 7 · Esf 3 · **VERIFICADO EN PGLITE** · Deps M201.
- **M210 · Protección anti escalada de privilegios (role/verified):** P0 · Impacto 9 · Esf 3 · **VERIFICADO EN PGLITE** · Deps M003.
- **M211 · Storage seguro (buckets públicos/privados + RLS):** P0 · Impacto 7 · Esf 3 · **PENDIENTE VALIDACIÓN SUPABASE** · Deps M201.
- **M212 · Errores de negocio controlados en RPCs:** P1 · Impacto 5 · Esf 2 · **VERIFICADO EN PGLITE** · Deps M002.

## Corrección de estado de los ítems P0 previos
Los siguientes se reclasifican de "seguro" a **IMPLEMENTADO EN CÓDIGO / VERIFICADO EN PGLITE / PENDIENTE VALIDACIÓN EN SUPABASE**:
- M002 (precio server-side): VERIFICADO EN PGLITE.
- M003 (verified/rating protegidos): VERIFICADO EN PGLITE.
- M007 (máquina de estados): VERIFICADO EN PGLITE.
- M009 (reseñas verificadas): VERIFICADO EN PGLITE.
- Doble booking / idempotencia de reserva: VERIFICADO EN PGLITE.
- Ver/modificar booking ajeno vía RLS: **PENDIENTE VALIDACIÓN EN SUPABASE** (PGlite no ejerce RLS de usuario final).
- Webhook idempotente de pago: **NOT RUN** (Edge Function no implementada; tabla lista).
- Documentos privados (Storage): **PENDIENTE VALIDACIÓN EN SUPABASE**.

## Entorno de testing
Node.js LTS instalado en este equipo; PGlite (Postgres WASM) como motor de pruebas reproducibles. Tests en `tests/run-tests.mjs`. Postgres nativo / Docker / Supabase CLI **no** disponibles (winget canceló la instalación de PostgreSQL con elevación).
