-- ============================================
-- MANITA — Migración 0007: Reseñas verificadas + rating real (M009, M010)
-- Fase 1.5: J (errores controlados), G (audit)
-- ============================================

CREATE OR REPLACE FUNCTION crear_resena(p_booking_id UUID, p_rating INT, p_comment TEXT)
RETURNS reviews AS $$
DECLARE v_b bookings; v_row reviews;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001'; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'INVALID_RATING' USING ERRCODE='P0001'; END IF;

  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF v_b.id IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF v_b.client_id <> auth.uid() THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
  -- Comprobar reseña existente ANTES del estado: tras reseñar, el booking pasa a 'reviewed'
  IF EXISTS (SELECT 1 FROM reviews WHERE booking_id = p_booking_id) THEN RAISE EXCEPTION 'ALREADY_REVIEWED' USING ERRCODE='P0001'; END IF;
  -- Debe estar completed o reviewed (reviewed no debería llegar aquí por el check anterior)
  IF v_b.status NOT IN ('completed') THEN RAISE EXCEPTION 'BOOKING_NOT_COMPLETED' USING ERRCODE='P0001'; END IF;

  INSERT INTO reviews(booking_id, client_id, professional_id, rating, comment)
    VALUES (p_booking_id, auth.uid(), v_b.professional_id, p_rating, p_comment)
    RETURNING * INTO v_row;

  UPDATE bookings SET status='reviewed', updated_at=NOW() WHERE id = p_booking_id;
  PERFORM write_audit('review_created','review', v_row.id, NULL, to_jsonb(v_row));
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalcular rating/reviews_count reales (M010)
CREATE OR REPLACE FUNCTION recompute_pro_rating()
RETURNS TRIGGER AS $$
DECLARE v_pro UUID;
BEGIN
  v_pro := COALESCE(NEW.professional_id, OLD.professional_id);
  -- Marca de escritura del sistema para que protect_professional_columns no revierta el recálculo
  PERFORM set_config('manita.system', 'on', true);
  UPDATE professionals p SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE professional_id = v_pro),0),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE professional_id = v_pro)
  WHERE p.id = v_pro;
  PERFORM set_config('manita.system', 'off', true);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recompute_rating ON reviews;
CREATE TRIGGER trg_recompute_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_pro_rating();

-- ROLLBACK:
--   DROP TRIGGER trg_recompute_rating ON reviews; DROP FUNCTION recompute_pro_rating();
--   DROP FUNCTION crear_resena(UUID,INT,TEXT);
