# Configurar correo propio (SMTP) — pendiente para producción

## Por qué
Supabase (plan free) usa un servidor de correo de prueba con un límite muy bajo de
envíos por hora. Al registrarse varias personas seguidas aparece el error:
**"email rate limit exceeded"**.

Para PRUEBAS lo resolvimos desactivando la confirmación por correo
(Authentication → Providers → Email → "Confirm email" = OFF).

Para PRODUCCIÓN (cuando se lance al público y se quiera volver a exigir confirmación
de correo), hay que conectar un proveedor SMTP propio. Así el límite lo define el
proveedor (no Supabase) y desaparece el problema.

## Opciones gratis recomendadas
- **Resend** — https://resend.com (3,000 correos/mes gratis, fácil de configurar).
- **Brevo (ex Sendinblue)** — https://www.brevo.com (300 correos/día gratis).
- **Mailgun**, **SendGrid** — también tienen planes gratuitos.

## Pasos generales (con Resend como ejemplo)
1. Crear cuenta en el proveedor y verificar un dominio (o usar su dominio de pruebas).
2. Obtener los datos SMTP: host, puerto, usuario, contraseña/API key.
3. En Supabase: **Authentication → Emails → SMTP Settings** → activar "Enable Custom SMTP".
4. Rellenar:
   - Sender email: no-reply@tudominio.com (o el que dé el proveedor)
   - Sender name: Manita
   - Host: (el del proveedor, ej. smtp.resend.com)
   - Port: 465 o 587
   - Username / Password: los del proveedor
5. Guardar y enviar un correo de prueba.
6. Volver a activar **"Confirm email"** en Authentication → Providers → Email.

## Personalizar plantillas de correo (opcional)
Authentication → Emails → Templates: se pueden editar los textos de confirmación,
recuperación de contraseña, etc., con la marca de Manita (colores, logo, español mexicano).

## Estado
- [x] Solución de pruebas aplicada: confirmación de correo DESACTIVADA.
- [ ] SMTP propio configurado (pendiente para lanzamiento público).
- [ ] "Confirm email" reactivado tras configurar SMTP.
