# SPEC MANITA MVP — Marketplace Transaccional

> Especificación ejecutable derivada de `AUDITORIA_MANITA.md`.
> Alcance: convertir los P0/P1 necesarios en un marketplace que **cobra y opera** de verdad.
> Backend: **Supabase** (Postgres + Auth + RLS + RPCs + Edge Functions). Sin microservicios. Sin reconstrucciones prematuras.

## Principio rector de seguridad
La `anon key` es pública. **Toda** operación sensible (dinero, estados, rating, verified, permisos) se valida **server-side** vía RLS + RPCs `SECURITY DEFINER` + Edge Functions. El cliente **nunca** envía precio, estado ni flags de confianza.

---

## 1. Arquitectura objetivo (MVP)

```
[ Navegador (HTML/CSS/JS estático, Netlify) ]
        |  supabase-js (anon key)
        v
[ Supabase ]
  ├─ Auth (email/pass, magic link luego)
  ├─ Postgres
  │    ├─ Tablas: profiles, categories, professionals,
  │    │          bookings, reviews, payments, notifications
  │    ├─ RLS en todas
  │    ├─ RPCs SECURITY DEFINER (crear_reserva, transición estados, crear_reseña)
  │    └─ Triggers (rating agregado, timestamps, protección de columnas)
  └─ Edge Functions
       ├─ create-payment      (crea intento de pago)
       ├─ payment-webhook      (idempotente; actualiza payment_status)
       └─ notify               (email vía proveedor)
[ Proveedor de pagos: Mercado Pago (México) ]  ← ver §7
[ Proveedor de email: Resend/SMTP ]
```

Sin cambios de stack. El frontend estático permanece; solo se le conectan RPCs y Edge Functions.

---

## 2. Roles y permisos (RBAC ligero)

Roles derivados de datos, no de un sistema de roles pesado:
- **anónimo:** solo lectura de `professionals` (públicos), `categories`, `reviews`.
- **cliente:** cualquier usuario autenticado. Crea reservas, paga, reseña sus bookings completados.
- **profesional:** usuario con fila en `professionals` (`user_id = auth.uid()`). Ve/gestiona sus reservas.
- **admin:** `profiles.role = 'admin'`. Único que edita `verified`, resuelve disputas.

Se añade `profiles.role TEXT DEFAULT 'user'` (valores: `user`, `admin`). El rol de "profesional" es implícito por existencia de fila en `professionals`, no una columna de rol.

---

## 3. Modelo de datos (cambios)

### Tablas existentes (KEEP + ajustes)
- `profiles`: **+** `role TEXT DEFAULT 'user'`, `phone` ya existe.
- `professionals`: columnas `verified`, `rating`, `reviews_count` pasan a ser **read-only para el dueño** (protegidas por trigger). **+** `status TEXT DEFAULT 'pending_review'` (`pending_review`, `active`, `suspended`).
- `bookings`: **+** `payment_status TEXT DEFAULT 'unpaid'`. `status` pasa a máquina de estados explícita (§6). `price` se escribe **solo** por RPC.
- `reviews`: KEEP. Inserción solo por RPC que valida booking completado.

### Tablas nuevas
- `payments`: registro de pagos e idempotencia de webhooks.
- `notifications`: cola/registro de notificaciones enviadas.

Detalle SQL en §4.

---

## 4. Cambios SQL (migraciones)

Migraciones versionadas en `supabase/migrations/` (M201). Cada bloque = una migración.

### 0002_roles_and_status.sql
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_review';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Restringir valores válidos
ALTER TABLE bookings ADD CONSTRAINT bookings_status_chk
  CHECK (status IN ('pending','confirmed','in_progress','completed','reviewed','cancelled'));
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_chk
  CHECK (payment_status IN ('unpaid','authorized','captured','refunded','failed'));
ALTER TABLE professionals ADD CONSTRAINT professionals_status_chk
  CHECK (status IN ('pending_review','active','suspended'));
```

### 0003_payments_notifications.sql
```sql
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                 -- 'mercadopago'
  provider_payment_id TEXT,               -- id del pago en el proveedor
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'created', -- created, authorized, captured, refunded, failed
  raw JSONB,                              -- payload del proveedor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Idempotencia de webhooks: un evento del proveedor se procesa una sola vez
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider, event_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                     -- booking_created, booking_confirmed, ...
  channel TEXT NOT NULL DEFAULT 'email',
  payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_date ON bookings(professional_id, service_date);
CREATE INDEX IF NOT EXISTS idx_professionals_cat_rating ON professionals(category_id, rating DESC);
```

### 0004_protect_columns.sql (M003)
```sql
-- Impide que el dueño altere verified/rating/reviews_count/status via UPDATE directo
CREATE OR REPLACE FUNCTION protect_professional_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) <> 'admin' THEN
    NEW.verified      := OLD.verified;
    NEW.rating        := OLD.rating;
    NEW.reviews_count := OLD.reviews_count;
    NEW.status        := OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_professional
  BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION protect_professional_columns();
```

### 0005_booking_rpcs.sql (M002, M007)
```sql
-- Crear reserva: el precio se LEE de professionals, nunca del cliente (M002)
CREATE OR REPLACE FUNCTION crear_reserva(
  p_professional_id UUID, p_date DATE, p_time TEXT, p_address TEXT, p_notes TEXT DEFAULT NULL
) RETURNS bookings AS $$
DECLARE v_price NUMERIC; v_row bookings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT price INTO v_price FROM professionals
    WHERE id = p_professional_id AND available = true AND status = 'active';
  IF v_price IS NULL THEN RAISE EXCEPTION 'PRO_UNAVAILABLE'; END IF;
  -- Anti doble-booking (mismo pro, misma fecha+hora, no cancelada)
  IF EXISTS (SELECT 1 FROM bookings WHERE professional_id = p_professional_id
      AND service_date = p_date AND service_time = p_time AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;
  INSERT INTO bookings(client_id, professional_id, service_date, service_time, address, price, notes, status, payment_status)
    VALUES (auth.uid(), p_professional_id, p_date, p_time, p_address, v_price, p_notes, 'pending', 'unpaid')
    RETURNING * INTO v_row;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transición de estado con validación de rol y transiciones válidas (M007)
CREATE OR REPLACE FUNCTION transicion_reserva(p_booking_id UUID, p_nuevo TEXT)
RETURNS bookings AS $$
DECLARE v_b bookings; v_pro_user UUID; v_is_client BOOL; v_is_pro BOOL;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF v_b IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT user_id INTO v_pro_user FROM professionals WHERE id = v_b.professional_id;
  v_is_client := (auth.uid() = v_b.client_id);
  v_is_pro := (auth.uid() = v_pro_user);
  IF NOT (v_is_client OR v_is_pro) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- Matriz de transiciones válidas
  IF v_b.status = 'pending'    AND p_nuevo = 'confirmed'   AND v_is_pro THEN NULL;
  ELSIF v_b.status = 'confirmed'  AND p_nuevo = 'in_progress' AND v_is_pro THEN NULL;
  ELSIF v_b.status = 'in_progress'AND p_nuevo = 'completed'   AND v_is_pro THEN NULL;
  ELSIF v_b.status IN ('pending','confirmed') AND p_nuevo = 'cancelled' THEN NULL; -- cliente o pro
  ELSE RAISE EXCEPTION 'INVALID_TRANSITION from % to %', v_b.status, p_nuevo;
  END IF;

  UPDATE bookings SET status = p_nuevo, updated_at = NOW() WHERE id = p_booking_id RETURNING * INTO v_b;
  RETURN v_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 0006_reviews_rpc.sql (M009, M010)
```sql
-- Reseña solo si el booking está completed y es del cliente (M009)
CREATE OR REPLACE FUNCTION crear_resena(p_booking_id UUID, p_rating INT, p_comment TEXT)
RETURNS reviews AS $$
DECLARE v_b bookings; v_row reviews;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF v_b IS NULL OR v_b.client_id <> auth.uid() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_b.status <> 'completed' THEN RAISE EXCEPTION 'BOOKING_NOT_COMPLETED'; END IF;
  IF EXISTS (SELECT 1 FROM reviews WHERE booking_id = p_booking_id) THEN RAISE EXCEPTION 'ALREADY_REVIEWED'; END IF;
  IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'INVALID_RATING'; END IF;
  INSERT INTO reviews(booking_id, client_id, professional_id, rating, comment)
    VALUES (p_booking_id, auth.uid(), v_b.professional_id, p_rating, p_comment) RETURNING * INTO v_row;
  UPDATE bookings SET status = 'reviewed', updated_at = NOW() WHERE id = p_booking_id;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalcular rating/reviews_count reales (M010)
CREATE OR REPLACE FUNCTION recompute_pro_rating() RETURNS TRIGGER AS $$
DECLARE v_pro UUID;
BEGIN
  v_pro := COALESCE(NEW.professional_id, OLD.professional_id);
  UPDATE professionals p SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE professional_id = v_pro),0),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE professional_id = v_pro)
  WHERE p.id = v_pro;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_recompute_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_pro_rating();
```

---

## 5. RLS (políticas corregidas) — 0007_rls.sql (M002, M003, M006)

```sql
-- Revocar INSERT/UPDATE directos que permitían manipulación
DROP POLICY IF EXISTS "Crear reserva" ON bookings;
DROP POLICY IF EXISTS "Actualizar reserva propia" ON bookings;

-- bookings: SELECT para cliente Y profesional involucrados (M006)
CREATE POLICY "Ver reservas cliente" ON bookings FOR SELECT
  USING (auth.uid() = client_id);
CREATE POLICY "Ver reservas profesional" ON bookings FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));
-- NO hay policy de INSERT/UPDATE directo: todo pasa por RPC SECURITY DEFINER.

-- professionals: SELECT público solo de activos; INSERT/UPDATE del dueño (columnas protegidas por trigger)
DROP POLICY IF EXISTS "Profesionales son públicos" ON professionals;
CREATE POLICY "Pros activos públicos" ON professionals FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id);
-- UPDATE del dueño permitido pero columnas sensibles revertidas por trigger (0004)

-- reviews: lectura pública; NO insert directo (solo RPC)
DROP POLICY IF EXISTS "Crear reseña propia" ON reviews;

-- payments/notifications: sin acceso directo del cliente (solo Edge Functions con service_role)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver mis notificaciones" ON notifications FOR SELECT USING (auth.uid() = user_id);
-- payments: sin policy de SELECT para cliente en MVP (se expone estado vía bookings.payment_status)
```

**Garantía:** con INSERT/UPDATE directos revocados en `bookings` y `reviews`, el cliente **no puede** crear reservas con precio arbitrario, saltar estados, ni reseñar sin booking completado. Todo pasa por RPCs que validan server-side.

---

## 6. Máquina de estados de reserva

```
              (pro)         (pro)          (pro)          (cliente)
  pending ──────────▶ confirmed ─────▶ in_progress ─────▶ completed ─────▶ reviewed
     │                    │
     └──────┬─────────────┘
            ▼ (cliente o pro, antes de in_progress)
        cancelled
```

- Transiciones válidas y **quién** puede hacerlas están codificadas en `transicion_reserva` (§4).
- `reviewed` se alcanza **solo** vía `crear_resena` (no por transición directa).
- Cualquier transición fuera de la matriz → excepción `INVALID_TRANSITION`. **Imposible saltar estados desde DevTools** (validado en servidor).
- `payment_status` es **independiente** de `status` (§7).

---

## 7. Flujo de pagos (Mercado Pago — México)

> **Decisión honesta (regla del usuario):** Stripe no opera para negocios registrados en México con el modelo marketplace/escrow completo de forma sencilla; **Mercado Pago** es el estándar en MX. Mercado Pago **no ofrece un "escrow" nativo genérico**. Por tanto **NO simulamos escrow**. El MVP implementa un flujo real y honesto:

**Flujo MVP real (retención lógica, no escrow bancario):**
1. Cliente reserva → `booking.status='pending'`, `payment_status='unpaid'`.
2. Cliente paga con Mercado Pago Checkout → Edge Function `create-payment` crea la preferencia/intención. Pago **capturado** al momento (MP no retiene genéricamente).
3. Webhook `payment-webhook` (idempotente) marca `payment_status='captured'` y `booking.status='confirmed'`.
4. El dinero queda en la **cuenta de Mercado Pago de Manita** (la plataforma). El payout al profesional (menos comisión) se hace tras `completed` mediante transferencia/Mercado Pago (M037, fase posterior).
5. Si el servicio no se completa o hay disputa → **reembolso real** vía API de MP (`payment_status='refunded'`).

Esto es un **escrow operado por la plataforma** (Manita retiene el dinero en su cuenta MP y paga al pro al completar), no un escrow bancario regulado. Se documenta así en términos legales (M023). **No se promete "custodia bancaria"** en el copy.

**Separación de estados (obligatoria):**
- `booking_status`: pending → confirmed → in_progress → completed → reviewed / cancelled
- `payment_status`: unpaid → authorized* → captured → refunded / failed  (*authorized solo si se usa captura diferida donde el proveedor lo permita)

**Idempotencia de webhooks:** cada evento se registra en `payment_webhook_events (provider, event_id)` con PK compuesta. Si el evento ya existe → se ignora (no se reprocesa). Previene pagos/actualizaciones duplicadas.

**Edge Functions:**
- `create-payment`: valida que el `booking` es del `auth.uid()`, lee monto de `bookings.price` (server), crea preferencia MP, guarda fila en `payments`.
- `payment-webhook`: verifica firma de MP, deduplica por `event_id`, actualiza `payments` y `bookings.payment_status`/`status`, encola notificación.
- Claves MP en **secrets** de Supabase (M202), nunca en el cliente.

---

## 8. Flujo cliente (extremo a extremo)

1. Explora/busca sin registro (lectura pública).
2. Abre perfil → ve datos reales, reseñas reales (RPC lectura), disponibilidad.
3. Pulsa "Reservar" → si no hay sesión, `login.html?next=`.
4. Llama `crear_reserva` (precio server) → `pending`.
5. Redirige a pago (Mercado Pago) → webhook → `confirmed` + `captured`.
6. Ve estado en "Mis reservas" (loading/empty/error/success).
7. Tras `completed` (marcado por el pro), puede reseñar vía `crear_resena`.

## 9. Flujo profesional

1. Alta (wizard, M029 fase posterior; MVP: alta básica corregida con precio+teléfono).
2. `status='pending_review'` hasta verificación (M038, fase posterior; MVP: admin activa).
3. Panel `pro-panel.html`: ve reservas entrantes (RLS M006).
4. Acciones: confirmar → en progreso → completado (RPC `transicion_reserva`).
5. Recibe notificación email en cada reserva nueva (M026).

---

## 10. Notificaciones

- Tabla `notifications` + Edge Function `notify` (email vía Resend/SMTP).
- Eventos MVP: `booking_created` (al pro), `booking_confirmed` (al cliente), `booking_completed` (al cliente, invita a reseñar).
- Encoladas por triggers/RPC; enviadas por función; `sent_at` marca entrega.
- Estados en UI: no aplica (backend), pero fallos se registran y reintentan.

## 11. Errores y estados de carga (UI)

Toda vista con datos remotos implementa 4 estados:
- **loading:** skeleton (no texto plano).
- **success:** datos.
- **empty:** mensaje con acción (distinto de error).
- **error:** mensaje + botón reintentar (distingue fallo de red de vacío).

Mapa de errores de RPC → mensajes UX:
`AUTH_REQUIRED`→"Inicia sesión", `PRO_UNAVAILABLE`→"Ya no disponible", `SLOT_TAKEN`→"Ese horario se ocupó", `INVALID_TRANSITION`/`FORBIDDEN`→"Acción no permitida", `BOOKING_NOT_COMPLETED`→"Solo puedes reseñar servicios completados", `ALREADY_REVIEWED`→"Ya reseñaste este servicio".

Sin `alert/confirm/prompt`: toasts + modales propios.

---

## 12. Seguridad — resumen de ataques bloqueados

| Ataque | Defensa |
|---|---|
| Precio manipulado desde DevTools | `crear_reserva` lee precio de DB; INSERT directo revocado |
| Saltar estados de reserva | `transicion_reserva` valida matriz + rol; UPDATE directo revocado |
| Auto-verificarse / inflar rating | Trigger `protect_professional_columns` revierte columnas |
| Reseña sin booking / no completado | `crear_resena` valida status y propiedad |
| Doble reseña | Chequeo de unicidad por booking |
| Ver reservas ajenas | RLS por client_id / user_id del pro |
| Doble booking mismo slot | Chequeo de solapamiento en RPC |
| Webhook/pago duplicado | `payment_webhook_events` (idempotencia) |
| Claves de pago expuestas | Secrets en Edge Functions, no en cliente |

---

## 13. Observabilidad

- Errores de Edge Functions → logs de Supabase + (fase) Sentry.
- Tabla `payments.raw` guarda payload del proveedor para auditoría.
- `notifications` registra envíos/fallos.
- Métricas MVP: nº reservas por estado, tasa de pago exitoso, webhooks fallidos.

## 14. Criterios de aceptación (MVP)

- [ ] Un cliente no puede crear una reserva con precio distinto al de la DB.
- [ ] Un usuario no puede confirmar/completar una reserva ajena.
- [ ] Un profesional ve solo sus reservas; un cliente solo las suyas.
- [ ] No se puede reseñar sin un booking `completed` propio.
- [ ] Un webhook repetido no duplica pago ni cambia estado dos veces.
- [ ] `verified`/`rating` no cambian por UPDATE del dueño.
- [ ] Toda vista remota muestra loading/empty/error/success.
- [ ] Cero `alert/confirm/prompt` en el código.
- [ ] Datos falsos (prensa/stats/SAMPLE_REVIEWS) eliminados.

## 15. Testing (matriz)

Casos exigidos: no autenticado · cliente · profesional · acceso a datos ajenos · manipulación de precio · de estado · de verified · reseña sin booking · reseña de booking no completado · doble reserva · pago duplicado · webhook duplicado · error de Supabase · pérdida de conexión · refresh durante operación · móvil · teclado/accesibilidad. (Ejecución documentada al cierre de cada fase.)

## 16. Migración desde el código actual

- `perfil.js`: `crearReserva({price})` → `supa.rpc('crear_reserva', {...})` sin precio.
- `supabase-client.js`: añadir wrappers RPC; quitar INSERT directo de reservas/reseñas.
- `perfil.js`: eliminar `SAMPLE_REVIEWS`; usar `obtenerReseñas`.
- `servicios.js`: eliminar badges inventados; filtro por `category_id`.
- `index.html`: eliminar prensa/stats/testimonios falsos.
- Headers: extraer a `components.js` (M013) tras estabilizar seguridad.

## 17. Estrategia de rollback

- Cada migración `000X` tiene su reverso documentado (`DROP FUNCTION/POLICY/COLUMN`).
- Migraciones aplicadas en orden; si una falla, se revierte solo esa.
- Frontend: cambios por archivo; Git permite revert por commit.
- Pagos: feature flag `PAYMENTS_ENABLED`; si falla, se desactiva el paso de pago dejando `pending` (reserva sin cobro) sin romper el resto.
- Los RPCs conviven con el código viejo hasta migrar cada página; se elimina el path viejo solo cuando el RPC está verificado.

---

# ADENDA FASE 1.5 — HARDENING DEL CORE (cambios sobre el spec original)

> Cambios aplicados y **verificados con Postgres real (PGlite)**: 21/21 tests PASS. Ver `TEST_PLAN_MANITA.md`.

## Cambios de arquitectura respecto al spec original
1. **Concurrencia (A):** el anti doble-booking ya NO depende de `IF EXISTS` (que tiene race condition). Ahora usa un **constraint de exclusión** `EXCLUDE USING gist (professional_id WITH =, tstzrange(start_at,end_at) WITH &&)` sobre reservas con `active_slot`. Postgres rechaza atómicamente el segundo INSERT solapado. `crear_reserva` captura `exclusion_violation` → `SLOT_TAKEN`.
2. **Reserva por tiempo real (C):** `bookings` pasa de `service_date+service_time` a **`start_at`/`end_at`/`duration_min`**. La duración viene de `professionals.duration_min`. `service_date`/`service_time` se mantienen derivados por compatibilidad.
3. **Disponibilidad real (B):** tablas `professional_availability` (horario semanal) y `professional_time_off` (vacaciones/bloqueos). `crear_reserva` valida server-side que el slot cae en franja disponible y no en time_off.
4. **Snapshot de precio (K):** `bookings` congela `base_price`, `service_fee`, `platform_fee`, `discount`, `total`, `currency`. Cambiar el precio del pro no afecta reservas pasadas.
5. **Dinero separado (L):** máquina financiera independiente en tablas `payments` (created→authorized→captured→refunded…), `refunds`, `payouts`. `booking.status` y `payment_status` son independientes.
6. **Idempotencia de reservas (E):** `bookings.idempotency_key` + índice único `(client_id, idempotency_key)`. `crear_reserva` devuelve la reserva existente si se repite la key (anti doble-submit).
7. **Cancelaciones/no-show/disputa (D):** estados explícitos `cancelled_by_client`, `cancelled_by_professional`, `no_show_client`, `no_show_professional`, `disputed`, con matriz de transiciones por actor.
8. **Roles y privilegios (F):** `profiles.role` (`user`/`admin`) + `suspended`. Triggers `protect_profile_columns` y `protect_professional_columns` impiden que un usuario se auto-eleve a admin o se auto-verifique. `is_admin()` centraliza la comprobación.
9. **Auditoría (G):** tabla `audit_log` + `write_audit()`. Registra creación/cambios de estado de booking, verificación de pro, cambios administrativos. Ampliable a refunds/payouts/disputas.
10. **Storage seguro (I/H):** buckets `avatars`/`portfolio` (públicos), `service`/`verification` (privados, URL firmada). Policies por carpeta = `auth.uid()`. Límites de tamaño y MIME. INE nunca público.
11. **Errores controlados (J):** todos los RPC lanzan códigos de negocio (`SLOT_TAKEN`, `UNAUTHORIZED`, `INVALID_STATE`, `BOOKING_NOT_FOUND`, `BOOKING_NOT_COMPLETED`, `OUTSIDE_AVAILABILITY`, etc.) con `ERRCODE='P0001'`. El frontend traduce por código; no expone mensajes internos de Postgres.
12. **Fee de plataforma:** `platform_fee_rate()` (15% por defecto) calcula `platform_fee` en el snapshot. El take rate real es decisión de negocio (pendiente).

## Webhooks (M) — especificación (implementación en Fase 2)
- **Idempotencia:** `payment_webhook_events (provider, event_id)` PK compuesta. Evento ya visto → ignorar.
- **Verificación de firma:** validar firma del proveedor (Mercado Pago) antes de procesar.
- **Eventos aceptados:** `payment.created`, `payment.approved`, `payment.refunded`. **Ignorados:** el resto (registrados con status `ignored`).
- **Retries/replay:** seguro por idempotencia; un replay no cambia estado dos veces.
- **Estados desconocidos:** se registran con status `error` y no mutan la reserva.
- **Reconciliación:** job periódico compara `payments` vs proveedor.

## No-show y disputas (N) — modelo preparado (operación en Fase 3)
Estados `no_show_client`/`no_show_professional`/`disputed` existen. La resolución (reembolso parcial, soporte manual) se implementará con `refunds` y un panel admin. Política financiera concreta = decisión de negocio pendiente.
