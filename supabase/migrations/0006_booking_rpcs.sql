-- ============================================
-- MANITA — Migración 0006: RPCs de reservas (hardened)
-- Fase 1.5: A (concurrencia), B (disponibilidad), C (duración), D (cancelaciones),
--           E (idempotencia), J (errores controlados), K (snapshot precio), G (audit)
-- ============================================

-- Config de fees de plataforma (ajustable). Take rate por defecto 15%.
CREATE OR REPLACE FUNCTION platform_fee_rate() RETURNS NUMERIC AS $$ SELECT 0.15::numeric $$ LANGUAGE sql IMMUTABLE;

-- ------------------------------------------------------------------
-- crear_reserva: atómica, idempotente, con snapshot de precio y validación de disponibilidad
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crear_reserva(
  p_professional_id UUID,
  p_start_at TIMESTAMPTZ,
  p_address TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS bookings AS $$
DECLARE
  v_pro professionals;
  v_row bookings;
  v_end TIMESTAMPTZ;
  v_weekday INT;
  v_local_start TIME;
  v_local_end TIME;
  v_base NUMERIC; v_platform NUMERIC; v_total NUMERIC;
  v_existing bookings;
BEGIN
  -- Auth
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001'; END IF;
  -- Usuario suspendido no puede reservar
  IF COALESCE((SELECT suspended FROM profiles WHERE id = auth.uid()), FALSE) THEN
    RAISE EXCEPTION 'USER_SUSPENDED' USING ERRCODE='P0001';
  END IF;
  IF p_address IS NULL OR length(trim(p_address)) < 5 THEN RAISE EXCEPTION 'ADDRESS_REQUIRED' USING ERRCODE='P0001'; END IF;
  IF p_start_at IS NULL OR p_start_at < NOW() THEN RAISE EXCEPTION 'INVALID_TIME' USING ERRCODE='P0001'; END IF;

  -- Idempotencia (E): si ya existe una reserva con esta key para este cliente, devolverla
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM bookings
      WHERE client_id = auth.uid() AND idempotency_key = p_idempotency_key;
    IF v_existing.id IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;

  -- Profesional debe existir, estar activo y disponible
  SELECT * INTO v_pro FROM professionals
    WHERE id = p_professional_id AND status = 'active' AND available = TRUE;
  IF v_pro.id IS NULL THEN RAISE EXCEPTION 'PRO_UNAVAILABLE' USING ERRCODE='P0001'; END IF;

  -- Duración/ventana (C)
  v_end := p_start_at + make_interval(mins => v_pro.duration_min);

  -- Disponibilidad: el horario debe caer dentro de una franja semanal del pro (B)
  v_weekday   := EXTRACT(DOW FROM p_start_at)::int;
  v_local_start := (p_start_at)::time;
  v_local_end   := (v_end)::time;
  IF NOT EXISTS (
    SELECT 1 FROM professional_availability a
    WHERE a.professional_id = p_professional_id
      AND a.weekday = v_weekday
      AND a.start_time <= v_local_start
      AND a.end_time   >= v_local_end
  ) THEN
    RAISE EXCEPTION 'OUTSIDE_AVAILABILITY' USING ERRCODE='P0001';
  END IF;

  -- Excepciones (vacaciones / bloqueos) (B)
  IF EXISTS (
    SELECT 1 FROM professional_time_off t
    WHERE t.professional_id = p_professional_id
      AND tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_start_at, v_end, '[)')
  ) THEN
    RAISE EXCEPTION 'OUTSIDE_AVAILABILITY' USING ERRCODE='P0001';
  END IF;

  -- Snapshot de precio (K): se congela el precio actual del pro
  v_base := v_pro.price;
  v_platform := ROUND(v_base * platform_fee_rate(), 2);
  v_total := v_base;   -- el cliente paga el precio del servicio; la fee se descuenta al pro (payout)

  -- INSERT. La concurrencia (A) está garantizada por el constraint EXCLUDE bookings_no_overlap:
  -- si dos requests intentan el mismo slot a la vez, Postgres rechaza el segundo con exclusion_violation.
  BEGIN
    INSERT INTO bookings(
      client_id, professional_id, service_date, service_time, address, notes,
      start_at, end_at, duration_min, idempotency_key,
      price, base_price, service_fee, platform_fee, discount, total, currency,
      status, payment_status
    ) VALUES (
      auth.uid(), p_professional_id, (p_start_at)::date, to_char(p_start_at,'HH24:MI'), p_address, p_notes,
      p_start_at, v_end, v_pro.duration_min, p_idempotency_key,
      v_total, v_base, 0, v_platform, 0, v_total, 'MXN',
      'pending', 'unpaid'
    ) RETURNING * INTO v_row;
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE EXCEPTION 'SLOT_TAKEN' USING ERRCODE='P0001';
    WHEN unique_violation THEN
      -- carrera de idempotencia: devolver la existente
      SELECT * INTO v_existing FROM bookings WHERE client_id = auth.uid() AND idempotency_key = p_idempotency_key;
      IF v_existing.id IS NOT NULL THEN RETURN v_existing; END IF;
      RAISE EXCEPTION 'SLOT_TAKEN' USING ERRCODE='P0001';
  END;

  PERFORM write_audit('booking_created','booking', v_row.id, NULL, to_jsonb(v_row));
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------
-- transicion_reserva: matriz de estados con cancelaciones explícitas (D) y audit (G)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION transicion_reserva(p_booking_id UUID, p_nuevo TEXT)
RETURNS bookings AS $$
DECLARE v_b bookings; v_pro_user UUID; v_is_client BOOL; v_is_pro BOOL; v_old TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF v_b.id IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE='P0001'; END IF;

  SELECT user_id INTO v_pro_user FROM professionals WHERE id = v_b.professional_id;
  v_is_client := (auth.uid() = v_b.client_id);
  v_is_pro    := (auth.uid() = v_pro_user);
  IF NOT (v_is_client OR v_is_pro OR is_admin()) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;

  v_old := v_b.status;

  -- Matriz de transiciones válidas (D)
  IF    v_b.status='pending'     AND p_nuevo='confirmed'    AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status='confirmed'   AND p_nuevo='in_progress'  AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status='in_progress' AND p_nuevo='completed'    AND (v_is_pro OR is_admin()) THEN NULL;
  -- Cancelaciones explícitas por actor
  ELSIF v_b.status IN ('pending','confirmed') AND p_nuevo='cancelled_by_client'       AND (v_is_client OR is_admin()) THEN NULL;
  ELSIF v_b.status IN ('pending','confirmed') AND p_nuevo='cancelled_by_professional' AND (v_is_pro OR is_admin()) THEN NULL;
  -- No-show (marcable por la contraparte tras la hora de inicio)
  ELSIF v_b.status='confirmed'   AND p_nuevo='no_show_client'       AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status='confirmed'   AND p_nuevo='no_show_professional' AND (v_is_client OR is_admin()) THEN NULL;
  -- Disputa (cualquiera de las partes, tras completed o no-show)
  ELSIF v_b.status IN ('completed','no_show_client','no_show_professional') AND p_nuevo='disputed' THEN NULL;
  ELSE
    RAISE EXCEPTION 'INVALID_STATE' USING ERRCODE='P0001';
  END IF;

  UPDATE bookings SET status=p_nuevo, updated_at=NOW() WHERE id=p_booking_id RETURNING * INTO v_b;
  PERFORM write_audit('booking_status_change','booking', v_b.id,
    jsonb_build_object('status',v_old), jsonb_build_object('status',p_nuevo));
  RETURN v_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ROLLBACK:
--   DROP FUNCTION crear_reserva(UUID,TIMESTAMPTZ,TEXT,TEXT,TEXT);
--   DROP FUNCTION transicion_reserva(UUID,TEXT); DROP FUNCTION platform_fee_rate();
