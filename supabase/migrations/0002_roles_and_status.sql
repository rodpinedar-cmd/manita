-- ============================================
-- MANITA — Migración 0002: Roles, estados, duración, snapshot de precio
-- Fase 1.5 hardening: C (duración), K (snapshot precio), L (separación dinero), F (roles)
-- ============================================

-- --- ROLES (F) ---
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_chk;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_chk CHECK (role IN ('user','admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- --- PROFESSIONALS: status + duración/buffer del servicio (C) ---
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_review';
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_status_chk;
ALTER TABLE professionals ADD CONSTRAINT professionals_status_chk
  CHECK (status IN ('pending_review','active','suspended'));
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS duration_min INT NOT NULL DEFAULT 60;   -- duración estándar del servicio
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS buffer_min INT NOT NULL DEFAULT 30;      -- margen entre servicios
ALTER TABLE professionals ADD CONSTRAINT professionals_duration_chk CHECK (duration_min BETWEEN 15 AND 600);
ALTER TABLE professionals ADD CONSTRAINT professionals_buffer_chk CHECK (buffer_min BETWEEN 0 AND 240);
UPDATE professionals SET status = 'active' WHERE status = 'pending_review';

-- --- BOOKINGS: tiempo real (start_at/end_at), snapshot de precio, idempotencia (C, E, K) ---
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_min INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT;         -- anti doble submit (E)
-- Snapshot de precio (K): la reserva congela el precio; el del pro puede cambiar mañana
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_price NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MXN';

-- Estados de booking (D: cancelaciones explícitas + no-show)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_chk;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_chk CHECK (status IN (
  'pending','confirmed','in_progress','completed','reviewed',
  'cancelled_by_client','cancelled_by_professional','no_show_client','no_show_professional','disputed'
));

-- Idempotencia de creación de reserva por cliente (E)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_idempotency
  ON bookings(client_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ROLLBACK: ver comentarios al pie de cada bloque en spec §17.

-- --- BOOKINGS: payment_status espejo (L) para lectura del cliente sin exponer payments ---
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_chk;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_chk
  CHECK (payment_status IN ('unpaid','authorized','captured','refunded','partially_refunded','failed'));
