-- ============================================================
-- MANITA — Permitir que el profesional edite su disponibilidad
-- Añade la policy de escritura (crear/editar/borrar) de su propio horario.
-- Corre esto UNA vez en Supabase → SQL Editor. Idempotente.
-- ============================================================
DROP POLICY IF EXISTS "Dueño edita disponibilidad" ON professional_availability;
CREATE POLICY "Dueño edita disponibilidad" ON professional_availability FOR ALL
  USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));
