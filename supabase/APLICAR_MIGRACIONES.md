# Cómo aplicar las migraciones (sin CLI)

Se aplican **manualmente** en el SQL Editor de Supabase, en orden estricto.
(Node.js quedó instalado en este equipo para los tests con PGlite, pero el proyecto Supabase remoto se actualiza a mano.)

## Orden de aplicación
1. `migrations/0001_init.sql` — schema base (idempotente, IF NOT EXISTS)
2. `migrations/0002_roles_and_status.sql` — roles, suspensión, status, duración/buffer, start_at/end_at, snapshot de precio, idempotency_key, payment_status
3. `migrations/0003_payments_notifications.sql` — payments/refunds/payouts, webhooks idempotentes, notifications, **audit_log**, índices
4. `migrations/0004_availability_concurrency.sql` — btree_gist, disponibilidad, time_off, **constraint EXCLUDE anti-solapamiento**
5. `migrations/0005_protect_columns.sql` — is_admin(), write_audit(), triggers de protección de columnas
6. `migrations/0006_booking_rpcs.sql` — crear_reserva (snapshot, idempotencia, disponibilidad, concurrencia), transicion_reserva (cancelaciones, no-show, disputa)
7. `migrations/0007_reviews_rpc.sql` — crear_resena + trigger de rating real
8. `migrations/0008_rls.sql` — RLS corregido (revoca INSERT/UPDATE directos)
9. `migrations/0009_storage.sql` — buckets y policies de Storage (**ejecutar en Supabase**; se omite en tests locales porque usa el esquema `storage.*`)

## Pasos
1. Supabase → SQL Editor → New query.
2. Pega cada archivo **en orden** y ejecuta uno por uno, verificando que no haya error.

## Configuración adicional
- **Auth URL (M001):** Authentication → URL Configuration → Site URL = `https://manita-cdmx.netlify.app`, Redirect = `https://manita-cdmx.netlify.app/**`.
- **Primer admin:** como los triggers protegen `role`, márcalo con service_role (SQL Editor corre como service_role, que **bypassa** los triggers de usuario). Ejecuta:
  `UPDATE profiles SET role='admin' WHERE id='<tu-user-id>';`
- **Activar un pro (pending_review → active):** como admin desde la app, o vía SQL Editor:
  `UPDATE professionals SET status='active', verified=true WHERE id='<pro-id>';`
- **Disponibilidad de un pro (obligatoria para poder reservarlo):**
  ```sql
  INSERT INTO professional_availability(professional_id, weekday, start_time, end_time)
  SELECT '<pro-id>', d, '08:00', '20:00' FROM generate_series(1,6) d;  -- lun-sáb 8-20
  ```

## Verificación en Supabase
Ver `TEST_PLAN_MANITA.md`. Los mismos casos corren automáticamente en local con:
`cd tests && node run-tests.mjs`  (21 tests, todos PASS al momento de escribir esto).

## Pagos y Storage (Fase 2 — pendiente)
- Edge Functions `create-payment` y `payment-webhook` (Mercado Pago) requieren despliegue vía CLI o dashboard.
- `0009_storage.sql` debe ejecutarse en Supabase (no en PGlite).
