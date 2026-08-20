-- ============================================
-- MANITA — Migración 0004: Disponibilidad (B) + concurrencia real (A)
-- ============================================

-- Extensión para constraints de exclusión por rango (anti-solapamiento a nivel motor)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- --- DISPONIBILIDAD DEL PROFESIONAL (B) ---
-- Horario semanal recurrente (día 0=domingo..6=sábado)
CREATE TABLE IF NOT EXISTS professional_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT avail_time_chk CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_avail_pro ON professional_availability(professional_id, weekday);

-- Excepciones: vacaciones, días bloqueados, descansos puntuales (B)
CREATE TABLE IF NOT EXISTS professional_time_off (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  CONSTRAINT timeoff_range_chk CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_timeoff_pro ON professional_time_off(professional_id, starts_at);

-- --- CONCURRENCIA (A): imposibilidad de doble-booking a nivel de motor ---
-- Rango de tiempo ocupado por cada reserva no cancelada. Postgres rechaza cualquier
-- INSERT que solape con otro del mismo profesional. Esto es atómico y a prueba de race.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS active_slot BOOLEAN
  GENERATED ALWAYS AS (status IN ('pending','confirmed','in_progress','completed','reviewed')) STORED;

-- Constraint de exclusión: mismo profesional + rangos [start_at,end_at) que se solapan + slot activo => rechazado
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (active_slot AND start_at IS NOT NULL AND end_at IS NOT NULL);

-- NOTA: al cancelar (status pasa a cancelled_*), active_slot=false y el slot se libera
-- automáticamente, permitiendo que otro cliente reserve ese horario.

-- ROLLBACK:
--   ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap;
--   ALTER TABLE bookings DROP COLUMN active_slot;
--   DROP TABLE professional_time_off; DROP TABLE professional_availability;
