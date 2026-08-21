# Manita — Estado del proyecto

Última actualización: 21 de agosto de 2026
Producción: https://manita-cdmx.netlify.app · Repo: github.com/rodpinedar-cmd/manita (rama main, auto-deploy Netlify)

Manita es un marketplace de servicios a domicilio para CDMX (tipo Webel/TaskRabbit).
Stack: HTML + CSS + JS vanilla + Supabase (backend) + Netlify (hosting). Instalable como PWA/APK.

---

## 1. Qué YA funciona (verificado)

### Cuentas y acceso
- Registro e inicio de sesión reales (Supabase Auth). Ya se registraron personas reales.
- Trigger a prueba de fallos: crear cuenta ya no da "Database error saving user".
- Confirmación de correo DESACTIVADA para pruebas (evita "email rate limit").
- Consentimiento obligatorio de Términos y Privacidad al registrarse (cliente y profesional).

### Marketplace — lado CLIENTE
- Ver profesionales con foto, rating real, reseñas, zona y precio.
- Filtros: categoría, disponibilidad, verificados, **precio máximo** y **zona/colonia**.
- **Ordenar** por relevancia, mejor calificados, precio (asc/desc).
- Reservar: elige fecha/hora/dirección; el PRECIO se calcula en el servidor (no manipulable).
- "Mis reservas" con estados; cancelar; "Reservar de nuevo".
- Dejar reseña al completar un servicio (el rating del pro sube solo).
- "Actividad": centro de notificaciones in-app del ciclo de la reserva + badge de novedades.

### Marketplace — lado PROFESIONAL
- Alta como profesional (perfil, servicio, precio, zona).
- Panel del profesional tipo app: resumen (pendientes/confirmadas/completadas),
  filtro por estado, y acciones Confirmar → Iniciar → Completar / Rechazar.
- Editar su disponibilidad semanal (días y horario) desde el panel.

### Ciclo transaccional (verificado 8/8 en Postgres real)
Cliente reserva → Pro confirma → inicia → completa → Cliente reseña → rating sube.
Cancelaciones por cliente y por profesional funcionan con los estados correctos.

### PWA / instalación
- Instalable en Android (APK/PWA) e iPhone (Agregar a pantalla de inicio desde Safari).
- Onboarding de bienvenida (3 slides) la primera vez en modo app.
- Banner guía para iPhone + modal de descarga con QR y pestañas Android/iPhone.
- Service worker network-first: los cambios se ven al instante tras cada deploy.

### Legal (borrador robusto, aplicado en web y app)
- legal.html: T&C, Aviso de Privacidad (LFPDPPP + derechos ARCO), qué datos pedimos
  a cliente y profesional, pagos, reembolsos, disputas, reglas del profesional.
- cuenta.html: sección Privacidad y datos, cerrar sesión y eliminar cuenta (ARCO).
- Copy revisado para no hacer publicidad engañosa (PROFECO).

### Calidad (suite de tests reejecutable)
- smoke-local: 70/70 · browser-smoke: 45/45 · a11y-audit: 0 violaciones serias
- verify-setup (SETUP+SEED+SIGNUP en PGlite): OK
- user-sim (20 usuarios, 4 dispositivos, 240 páginas): 0 hallazgos
- Galería visual: tests/GALERIA.html (regenerar con `node user-sim.mjs`)

---

## 2. Configuración que TÚ ya hiciste en Supabase
- Aplicado APLICAR_TODO.sql (esquema completo + RPCs + datos demo + trigger signup).
- Tu cuenta (rpr1805@gmail.com) es admin.
- Confirm email desactivado (pruebas).

## 3. Configuración PENDIENTE en Supabase (recomendado)
- [ ] Authentication → URL Configuration: Site URL y Redirect URLs a manita-cdmx.netlify.app
      (arregla el "localhost:3000" al confirmar correo).
- [ ] Correr ADD_EDITAR_DISPONIBILIDAD.sql (para que el pro edite su horario en vivo).
- [ ] (Opcional para probar el panel pro tú mismo) correr PROBAR_EN_VIVO.sql.

---

## 4. Lo que FALTA para lanzar en serio

### Decisiones de negocio (tú)
- [ ] 10 decisiones del modelo económico: % de comisión, quién paga la comisión de la
      pasarela, plazos de liberación al pro, política de reembolsos exacta, etc.
      (ver MODELO_ECONOMICO_PROPUESTA.md)
- [ ] Razón social / datos fiscales / contacto oficial para el aviso de privacidad.

### Pagos (cuando haya tracción)
- [ ] Integrar Mercado Pago con SPLIT de pagos (dinero no se retiene en Manita).
- [ ] Edge Functions: crear pago, capturar al completar, reembolsar, webhook.
      (ver PLAN_PAGOS_Y_LEGAL.md)

### Legal (antes de cobrar)
- [ ] Revisión con abogado fintech mexicano (Ley Fintech, PROFECO, LFPDPPP, CFDI/SAT).
- [ ] Reactivar confirmación de correo con SMTP propio (ver CONFIGURAR_CORREO_SMTP.md).

### Producto (mejoras futuras, opcionales)
- [ ] Notificaciones por email/push al pro cuando recibe una reserva.
- [ ] Chat cliente ↔ profesional.
- [ ] Más métodos de verificación de profesionales.

---

## 5. Documentos clave del repo
- ESTADO_DEL_PROYECTO.md (este archivo)
- PLAN_PAGOS_Y_LEGAL.md — cómo funcionan los pagos + checklist legal
- CONFIGURAR_CORREO_SMTP.md — activar correo propio en producción
- AUDITORIA_MANITA.md — backlog priorizado (200 items)
- SPEC_MANITA_MVP.md — especificación técnica
- MODELO_ECONOMICO_PROPUESTA.md — decisiones económicas pendientes
- supabase/APLICAR_TODO.sql — script único para montar todo el backend
- supabase/ADD_EDITAR_DISPONIBILIDAD.sql — policy para editar horario del pro
- supabase/PROBAR_EN_VIVO.sql — asignarte un profesional demo para pruebas

---

## 6. En una frase
El MVP está funcional de punta a punta (registro, buscar, reservar, gestionar, reseñar),
es instalable como app, tiene base legal y de calidad sólida. Lo que falta para
facturar es decidir el modelo económico e integrar la pasarela de pago con split,
más una revisión legal profesional.
