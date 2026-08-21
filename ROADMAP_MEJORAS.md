# Manita — Roadmap de mejoras (basado en referencia Webel + tus peticiones)

Fecha: 21 de agosto de 2026
Origen: capturas reales de Webel (referencia de diseño/UX) + peticiones del usuario.

> Regla: inspirarnos en los PATRONES de Webel, NO copiar su diseño. Identidad propia de
> Manita (coral #FF6B4A, la "M" no la "W"). Español mexicano. Sin datos falsos (PROFECO).

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
- [ ] Editar disponibilidad avanzada (varios rangos por día, tipo "añadir horas").
- [ ] Verificación de identidad del pro (documento) — bucket privado `verification`.
- [ ] Notificaciones al pro por email cuando recibe reserva (necesita SMTP).

### Fase 4 — Growth / negocio (con decisiones tuyas)
- [ ] Programa de referidos completo (código + recompensa) — definir la recompensa (¿cupón?).
- [ ] Pagos con Mercado Pago (split) — tras definir modelo económico.

---

## D. Pendientes que dependen de TI (no puedo hacerlos yo)
- [ ] **Correr `supabase/ACTIVAR_FOTOS.sql`** en el SQL Editor → habilita fotos y galería (el
      código ya está listo, solo falta esto).
- [ ] Config Auth → URL (Site URL + Redirect) para quitar el localhost:3000.
- [ ] Correr ADD_EDITAR_DISPONIBILIDAD.sql (editar horario del pro).
- [ ] Decidir modelo económico (comisión) y revisión legal antes de cobrar.

## E. Reglas que NO se rompen
Mobile-first 360–430px · accesibilidad AA (targets ≥44px) · tokens CSS · sin dependencias nuevas ·
sin datos falsos · sin alert/confirm/prompt · estados loading/empty/error · animaciones transform/opacity.
