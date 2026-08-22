# Manita — Roadmap de mejoras (basado en referencia Webel + tus peticiones)

Fecha: 21 de agosto de 2026
Origen: capturas reales de Webel (referencia de diseño/UX) + peticiones del usuario.

> Regla: inspirarnos en los PATRONES de Webel/Preply/GetNinjas, NO copiar su diseño. Identidad
> propia de Manita (AZUL #2563EB, la "M"). Español mexicano. Sin datos falsos (PROFECO).

---

## ⚠️ PENDIENTE DE HOSTING (recordatorio)
Netlify PAUSÓ los deploys por créditos agotados del ciclo (banner "operational credits").
Todo el rediseño AZUL está en GitHub (rama main) pero NO se ve en vivo hasta resolver esto.
Opciones: (a) drag-and-drop de la carpeta en Netlify, (b) esperar reinicio de créditos,
(c) MIGRAR A CLOUDFLARE PAGES (recomendado, gratis, sin límite de build). Ya existe `_headers`
listo para Cloudflare. → RETOMAR ESTO cuando el usuario quiera.

## REDISEÑO VISUAL (combinando Webel + Preply + GetNinjas) — hecho
- [x] Identidad AZUL confianza (#2563EB / texto #1D4ED8 AA). Tokens, hero, gradientes, splash,
      theme-color (13 HTML), manifest, iconos PWA regenerados. a11y 0 violaciones.
- [x] Hero con buscador central (servicio + zona) + chips de categorías populares.
- [x] Barra de confianza bajo el hero (estilo Preply, mensajes honestos).
- [x] Grid de categorías con contador REAL de profesionales por categoría (estilo Preply).
- [x] Tarjetas de servicio con hover azul + CTA destacado (estilo GetNinjas).
- [x] Cache-busting (CSS ?v=3 + SW manita-v4-azul).
- [x] Perfil del profesional: banda azul premium tras avatar + tarjeta reserva con borde azul +
      barras de rating en azul.
- [x] Login pulido (bienvenida con marca + foco azul).
- [x] mis-reservas (hover azul + estados AA) y reserva-confirmada (borde éxito verde).
- [x] Barrido final: 0 colores coral hardcodeados; solo queda ámbar para estrellas (intencional).
      Rediseño AZUL COMPLETO en todas las páginas clave. a11y 0 violaciones en toda la suite.

---

## A. Lo que aprendí de las capturas de Webel (patrones a adaptar)

1. **Registro de profesional por PASOS (wizard con barra de progreso).** Webel lo divide en:
   ciudad/zonas → horario → categoría del servicio → precio (€/h con opción de descuento por
   recurrencia) → "sobre mí" → foto de perfil → galería de trabajos → vídeo → verificación de
   identidad → acuerdo de colaboración. Cada paso con "checklist de buena práctica".
2. **Precio flexible por unidad:** €/hora, con opción de "descuento por recurrencia" (%). Manita
   ya tiene unidad (servicio/hora/sesión/visita) — falta hacerlo tan claro como Webel.
3. **Foto de perfil** con guía visual ("buena iluminación, cara visible, sonríe") + cámara/galería.
4. **Galería de trabajos anteriores** (portafolio) con checklist ("fotos de trabajos previos,
   servicios que realizas, buena resolución, SIN datos de contacto").
5. **Horario de trabajo** con toggles por día + rango horas + "añadir horas" (varios rangos/día).
6. **Dirección del servicio**: buscador de calle + "usar ubicación actual", y "Mis direcciones"
   guardadas con etiqueta. (Manita ya tiene direcciones; falta el selector al reservar tipo Webel.)
7. **Perfil del pro** con rating desglosado (Servicio, Comunicación, Amabilidad, Tiempo
   contratado, Comodidad) + comentarios. Manita ya lo tiene muy parecido.
8. **Cuenta minimalista** por secciones: Datos personales · Mis direcciones · Pagos y
   devoluciones · Cambiar contraseña · Notificaciones · Idioma · "Cambiar a versión profesional".
9. **Mensajes con 2 pestañas:** Chats y Alertas (notificaciones). Manita ya tiene "Actividad".
10. **Referidos** ("Regala X, gana X") con código + compartir. Manita ya tiene Web Share básico.

---

## B. Lo que TÚ pediste (prioridad de esta tanda)

1. **Diseño minimalista** — menos repetición, más simple. Aplicar a web y app.
2. **Registro de proveedor por tiempo/horas o por trabajo** — dejar clarísima la unidad de cobro.
3. **Foto de perfil** (cliente y profesional).
4. **Ejemplos de trabajos anteriores** (galería/portafolio del pro).
5. **Dirección del servicio** — añadir/gestionar y seleccionar al reservar.
6. Corazón en el perfil (#2) — HECHO en esta sesión.

---

## C. Plan de ejecución (orden propuesto)

### Fase 1 — Sin backend nuevo (rápido, alto impacto visual) — COMPLETA ✅
- [x] Corazón/favoritos en tarjetas y perfil (HECHO).
- [x] **Minimalismo cuenta.html**: se añadieron los estilos que FALTABAN (acc-user, acc-avatar,
      acc-referral no existían en el CSS y se veían sin formato). Nueva sección "Preferencias"
      tipo lista (avisos, ir a panel pro / ofrecer servicios, mis reservas, favoritos) con enlace
      dinámico según si ya es profesional.
- [x] **Alta de profesional más clara**: selector visual "¿Cómo cobras?" con 4 tarjetas (por
      trabajo / por hora / por sesión / por visita), ayuda contextual dinámica y descuento por
      recurrencia opcional (1–50%, se guarda en la bio). Validación de rango incluida.
- [x] **Selector de dirección al reservar**: ya estaba implementado en perfil.js
      (loadSavedAddresses + lógica en bookNow). Verificado.
- [x] Reducir textos repetidos y unificar el footer/legales (parcial ya hecho).

> Verificado: browser-smoke 50/50 · a11y 0 violaciones · smoke-local 70/70 · user-sim 0 hallazgos.

### Fase 2 — Fotos: CÓDIGO LISTO ✅ · falta que TÚ corras el SQL
> El código ya está implementado y probado. Para activarlo, corre UNA VEZ en el SQL Editor de
> Supabase el archivo `supabase/ACTIVAR_FOTOS.sql` (crea buckets avatars/portfolio + policies +
> columnas avatar_url y portfolio en professionals). En cuanto lo corras, la subida funciona sola.
- [x] **Foto de perfil** del profesional: función `subirAvatar()` + UI en pro-panel (preview,
      validación 2MB, tipos). Se muestra en el perfil (`avatarFor` ya usa `avatar_url`).
- [x] **Galería de trabajos anteriores** (bucket `portfolio`): `subirTrabajo()`/`borrarTrabajo()`
      + UI en pro-panel (hasta 6 fotos) + sección "Trabajos anteriores" en el perfil público.
- [x] Guía visual de "buena foto" (texto de ayuda) + validación de tamaño/tipo.
- [x] Degradación elegante: si no has corrido el SQL, muestra un aviso claro sin romper la app.
- [x] **Foto de perfil del cliente**: avatar clickeable en cuenta.html + `subirAvatarCliente()`
      (reusa bucket avatars, guarda en profiles.avatar_url). Incluido en ACTIVAR_FOTOS.sql.

### Fase 3 — Backend / operación
- [x] **Disponibilidad avanzada (varios rangos por día)**: pro-panel ahora permite añadir/quitar
      varios horarios por día (ej. 08-12 y 16-20), con validación de solapes. El backend ya lo
      soportaba; se probó end-to-end en PGlite (T4b: reserva mañana OK, tarde OK, hueco 13:00
      rechazado con OUTSIDE_AVAILABILITY). Suite run-tests 24/24.
- [x] **Verificación de identidad del pro**: sube INE/pasaporte a bucket PRIVADO `verification`
      (solo dueño/admin lo ven vía URL firmada). Tabla `verification_requests` + RPC
      `aprobar_verificacion` (solo admin). El pro NO puede auto-verificarse (trigger + RPC).
      UI de estado en pro-panel (sin enviar / en revisión / verificado / rechazado). Validado en
      PGlite (flujo completo: pro solicita → no puede auto-aprobar → admin aprueba → verified+active).
      > REQUIERE que corras `supabase/ACTIVAR_VERIFICACION.sql` para activarlo.
- [x] **Panel de admin web** (`admin.html` + `js/admin.js`): el admin aprueba/rechaza
      verificaciones desde la web (URL firmada para ver el INE, sin correr SQL a mano). Solo
      accesible para role=admin; noindex. Validado en tests (94/94 smoke, 51/51 browser).
- [ ] Notificaciones al pro por email cuando recibe reserva (necesita SMTP — depende de ti).

### Fase 4 — Growth / negocio (con decisiones tuyas)
- [ ] Programa de referidos completo (código + recompensa) — definir la recompensa (¿cupón?).
- [ ] Pagos con Mercado Pago (split) — tras definir modelo económico.

---

## D. Pendientes que dependen de TI (no puedo hacerlos yo)
- [x] **Correr `supabase/ACTIVAR_FOTOS.sql`** → HECHO (21 ago 2026). Buckets avatars/portfolio
      verificados públicos (2MB/5MB). Fotos y galería ya operativas.
- [ ] **Correr `supabase/ACTIVAR_VERIFICACION.sql`** → habilita la verificación de identidad
      (bucket privado + tabla + RPC). El código ya está listo y probado.
- [ ] Config Auth → URL (Site URL + Redirect) para quitar el localhost:3000.
- [ ] Correr ADD_EDITAR_DISPONIBILIDAD.sql (editar horario del pro).
- [ ] Decidir modelo económico (comisión) y revisión legal antes de cobrar.

## E. Reglas que NO se rompen
Mobile-first 360–430px · accesibilidad AA (targets ≥44px) · tokens CSS · sin dependencias nuevas ·
sin datos falsos · sin alert/confirm/prompt · estados loading/empty/error · animaciones transform/opacity.
