-- ============================================
-- MANITA — Migración 0008: RLS corregido (M002, M003, M006, H)
-- Revoca INSERT/UPDATE directos. Todo pasa por RPCs SECURITY DEFINER.
-- ============================================

-- --- BOOKINGS ---
DROP POLICY IF EXISTS "Crear reserva" ON bookings;
DROP POLICY IF EXISTS "Actualizar reserva propia" ON bookings;
DROP POLICY IF EXISTS "Ver reservas propias (cliente)" ON bookings;
DROP POLICY IF EXISTS "Ver reservas cliente" ON bookings;
DROP POLICY IF EXISTS "Ver reservas profesional" ON bookings;

CREATE POLICY "Ver reservas cliente" ON bookings FOR SELECT
  USING (auth.uid() = client_id);
CREATE POLICY "Ver reservas profesional" ON bookings FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));
-- SIN INSERT/UPDATE directo: crear_reserva y transicion_reserva son la única vía.

-- --- PROFESSIONALS ---
DROP POLICY IF EXISTS "Profesionales son públicos" ON professionals;
DROP POLICY IF EXISTS "Pros activos públicos" ON professionals;
CREATE POLICY "Pros activos públicos" ON professionals FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id OR is_admin());
-- UPDATE del dueño permitido (0001) pero columnas sensibles revertidas por trigger 0005.
-- Admin puede UPDATE (para verificar/suspender): policy dedicada
DROP POLICY IF EXISTS "Admin edita profesionales" ON professionals;
CREATE POLICY "Admin edita profesionales" ON professionals FOR UPDATE USING (is_admin());

-- --- REVIEWS ---
DROP POLICY IF EXISTS "Crear reseña propia" ON reviews;
-- Sin INSERT directo: solo crear_resena. Lectura pública se mantiene (0001).

-- --- PROFILES ---
-- role/suspended protegidos por trigger 0005. Admin puede leer todos los perfiles:
DROP POLICY IF EXISTS "Admin ve perfiles" ON profiles;
CREATE POLICY "Admin ve perfiles" ON profiles FOR SELECT USING (is_admin());

-- --- AVAILABILITY / TIME_OFF (B, H) ---
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_time_off ENABLE ROW LEVEL SECURITY;
-- Disponibilidad legible públicamente (para mostrar slots); editable solo por el dueño del pro
DROP POLICY IF EXISTS "Disponibilidad pública" ON professional_availability;
CREATE POLICY "Disponibilidad pública" ON professional_availability FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Dueño edita disponibilidad" ON professional_availability;
CREATE POLICY "Dueño edita disponibilidad" ON professional_availability FOR ALL
  USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));

DROP POLICY IF EXISTS "Timeoff dueño" ON professional_time_off;
CREATE POLICY "Timeoff dueño" ON professional_time_off FOR ALL
  USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));

-- ROLLBACK: recrear policies anteriores (inseguras) — no recomendado.
