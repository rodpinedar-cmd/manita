# PASO B — Activar el backend (5 min, gratis)

Esto hace que **reservar funcione de verdad** en vivo. Todo verificado en Postgres real.

## 1. Aplica el SQL (2 pasos)
En **supabase.com** → tu proyecto → **SQL Editor** → New query:

1. Abre `supabase/SETUP_COMPLETO.sql`, copia TODO, pega y **Run**. (Debe decir "Success".)
2. Nueva query → abre `supabase/SEED_DEMO.sql`, copia TODO, pega y **Run**.

## 2. Hazte admin (cambia tu email)
```sql
UPDATE profiles SET role='admin'
WHERE id = (SELECT id FROM auth.users WHERE email='TU_EMAIL_AQUI');
```

## 3. Configura el login en vivo
Supabase → **Authentication** → **URL Configuration**:
- **Site URL:** `https://manita-cdmx.netlify.app`
- **Redirect URLs:** `https://manita-cdmx.netlify.app/**`
- **Save**

## 4. Verifica que quedó bien
Abre en el navegador:
```
https://manita-cdmx.netlify.app/setup-check.html
```
Debe salir **✅ Backend listo (5/5)**. Si algún check sale en rojo, te dice exactamente qué falta.

## 5. Prueba el flujo completo
1. Regístrate como cliente → busca un servicio → abre un profesional → reserva.
2. Cierra sesión → entra como el profesional → `pro-panel.html` → confirma/completa.
3. Vuelve como cliente → deja reseña. El rating del pro se actualiza solo.

## Notas
- Los 12 profesionales demo del SEED tienen horario lun-sáb 08:00–20:00, listos para reservar.
- Si ves "Este profesional no está disponible" al reservar: revisa que el pro tenga `status='active'` y disponibilidad (el SEED ya lo hace).
- Pagos reales (Mercado Pago) son la Fase 2 — requiere tus 10 decisiones del modelo económico primero.
