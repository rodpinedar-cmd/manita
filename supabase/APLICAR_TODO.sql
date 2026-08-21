-- ============================================================
-- MANITA — APLICAR TODO (un solo Run en Supabase → SQL Editor)
-- Incluye: columnas faltantes + RPCs de reservas + disponibilidad +
-- trigger de signup a prueba de fallos + datos demo (12 pros con horario).
-- Es IDEMPOTENTE: se puede correr varias veces sin romper nada.
-- NO incluye Storage (buckets) para evitar errores; no hace falta para reservar.
-- Al final: instrucciones para hacerte admin.
-- ============================================================

-- ===== Columnas y estados (profiles / professionals / bookings) =====
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_chk;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_chk CHECK (role IN ('user','admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_review';
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_status_chk;
ALTER TABLE professionals ADD CONSTRAINT professionals_status_chk CHECK (status IN ('pending_review','active','suspended'));
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS duration_min INT NOT NULL DEFAULT 60;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS buffer_min INT NOT NULL DEFAULT 30;
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_duration_chk;
ALTER TABLE professionals ADD CONSTRAINT professionals_duration_chk CHECK (duration_min BETWEEN 15 AND 600);
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_buffer_chk;
ALTER TABLE professionals ADD CONSTRAINT professionals_buffer_chk CHECK (buffer_min BETWEEN 0 AND 240);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_min INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_price NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MXN';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_chk;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_chk CHECK (status IN (
  'pending','confirmed','in_progress','completed','reviewed',
  'cancelled_by_client','cancelled_by_professional','no_show_client','no_show_professional','disputed'));
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_chk;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_chk CHECK (payment_status IN ('unpaid','authorized','captured','refunded','partially_refunded','failed'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_idempotency ON bookings(client_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ===== Auditoría =====
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor UUID, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
  old_value JSONB, new_value JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ===== Disponibilidad + concurrencia =====
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS professional_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL, end_time TIME NOT NULL,
  CONSTRAINT avail_time_chk CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_avail_pro ON professional_availability(professional_id, weekday);
CREATE TABLE IF NOT EXISTS professional_time_off (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, reason TEXT,
  CONSTRAINT timeoff_range_chk CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_timeoff_pro ON professional_time_off(professional_id, starts_at);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS active_slot BOOLEAN
  GENERATED ALWAYS AS (status IN ('pending','confirmed','in_progress','completed','reviewed')) STORED;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (professional_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)
  WHERE (active_slot AND start_at IS NOT NULL AND end_at IS NOT NULL);

-- ===== Helpers + protección de columnas =====
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;
CREATE OR REPLACE FUNCTION write_audit(p_action TEXT, p_entity_type TEXT, p_entity_id UUID, p_old JSONB, p_new JSONB) RETURNS VOID AS $$
  INSERT INTO audit_log(actor, action, entity_type, entity_id, old_value, new_value)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_old, p_new);
$$ LANGUAGE sql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION protect_professional_columns() RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('manita.system', true) = 'on' THEN RETURN NEW; END IF;
  IF NOT is_admin() THEN
    NEW.verified := OLD.verified; NEW.rating := OLD.rating;
    NEW.reviews_count := OLD.reviews_count; NEW.status := OLD.status; NEW.user_id := OLD.user_id;
  ELSE
    IF NEW.verified IS DISTINCT FROM OLD.verified OR NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM write_audit('pro_verified','professional', OLD.id,
        jsonb_build_object('verified',OLD.verified,'status',OLD.status),
        jsonb_build_object('verified',NEW.verified,'status',NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_protect_professional ON professionals;
CREATE TRIGGER trg_protect_professional BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION protect_professional_columns();
CREATE OR REPLACE FUNCTION protect_profile_columns() RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_admin() THEN NEW.role := OLD.role; NEW.suspended := OLD.suspended;
  ELSE
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.suspended IS DISTINCT FROM OLD.suspended THEN
      PERFORM write_audit('admin_change','profile', OLD.id,
        jsonb_build_object('role',OLD.role,'suspended',OLD.suspended),
        jsonb_build_object('role',NEW.role,'suspended',NEW.suspended));
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_protect_profile ON profiles;
CREATE TRIGGER trg_protect_profile BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- ===== RPCs de reservas =====
CREATE OR REPLACE FUNCTION platform_fee_rate() RETURNS NUMERIC AS $$ SELECT 0.15::numeric $$ LANGUAGE sql IMMUTABLE;
CREATE OR REPLACE FUNCTION crear_reserva(p_professional_id UUID, p_start_at TIMESTAMPTZ, p_address TEXT, p_idempotency_key TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL)
RETURNS bookings AS $$
DECLARE v_pro professionals; v_row bookings; v_end TIMESTAMPTZ; v_weekday INT;
  v_local_start TIME; v_local_end TIME; v_base NUMERIC; v_platform NUMERIC; v_total NUMERIC; v_existing bookings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001'; END IF;
  IF COALESCE((SELECT suspended FROM profiles WHERE id = auth.uid()), FALSE) THEN RAISE EXCEPTION 'USER_SUSPENDED' USING ERRCODE='P0001'; END IF;
  IF p_address IS NULL OR length(trim(p_address)) < 5 THEN RAISE EXCEPTION 'ADDRESS_REQUIRED' USING ERRCODE='P0001'; END IF;
  IF p_start_at IS NULL OR p_start_at < NOW() THEN RAISE EXCEPTION 'INVALID_TIME' USING ERRCODE='P0001'; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM bookings WHERE client_id = auth.uid() AND idempotency_key = p_idempotency_key;
    IF v_existing.id IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;
  SELECT * INTO v_pro FROM professionals WHERE id = p_professional_id AND status = 'active' AND available = TRUE;
  IF v_pro.id IS NULL THEN RAISE EXCEPTION 'PRO_UNAVAILABLE' USING ERRCODE='P0001'; END IF;
  v_end := p_start_at + make_interval(mins => v_pro.duration_min);
  v_weekday := EXTRACT(DOW FROM p_start_at)::int;
  v_local_start := (p_start_at)::time; v_local_end := (v_end)::time;
  IF NOT EXISTS (SELECT 1 FROM professional_availability a WHERE a.professional_id = p_professional_id
      AND a.weekday = v_weekday AND a.start_time <= v_local_start AND a.end_time >= v_local_end) THEN
    RAISE EXCEPTION 'OUTSIDE_AVAILABILITY' USING ERRCODE='P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM professional_time_off t WHERE t.professional_id = p_professional_id
      AND tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_start_at, v_end, '[)')) THEN
    RAISE EXCEPTION 'OUTSIDE_AVAILABILITY' USING ERRCODE='P0001';
  END IF;
  v_base := v_pro.price; v_platform := ROUND(v_base * platform_fee_rate(), 2); v_total := v_base;
  BEGIN
    INSERT INTO bookings(client_id, professional_id, service_date, service_time, address, notes,
      start_at, end_at, duration_min, idempotency_key, price, base_price, service_fee, platform_fee, discount, total, currency, status, payment_status)
    VALUES (auth.uid(), p_professional_id, (p_start_at)::date, to_char(p_start_at,'HH24:MI'), p_address, p_notes,
      p_start_at, v_end, v_pro.duration_min, p_idempotency_key, v_total, v_base, 0, v_platform, 0, v_total, 'MXN', 'pending', 'unpaid')
    RETURNING * INTO v_row;
  EXCEPTION
    WHEN exclusion_violation THEN RAISE EXCEPTION 'SLOT_TAKEN' USING ERRCODE='P0001';
    WHEN unique_violation THEN
      SELECT * INTO v_existing FROM bookings WHERE client_id = auth.uid() AND idempotency_key = p_idempotency_key;
      IF v_existing.id IS NOT NULL THEN RETURN v_existing; END IF;
      RAISE EXCEPTION 'SLOT_TAKEN' USING ERRCODE='P0001';
  END;
  PERFORM write_audit('booking_created','booking', v_row.id, NULL, to_jsonb(v_row));
  RETURN v_row;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION transicion_reserva(p_booking_id UUID, p_nuevo TEXT) RETURNS bookings AS $$
DECLARE v_b bookings; v_pro_user UUID; v_is_client BOOL; v_is_pro BOOL; v_old TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF v_b.id IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  SELECT user_id INTO v_pro_user FROM professionals WHERE id = v_b.professional_id;
  v_is_client := (auth.uid() = v_b.client_id); v_is_pro := (auth.uid() = v_pro_user);
  IF NOT (v_is_client OR v_is_pro OR is_admin()) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
  v_old := v_b.status;
  IF    v_b.status='pending'     AND p_nuevo='confirmed'    AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status='confirmed'   AND p_nuevo='in_progress'  AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status='in_progress' AND p_nuevo='completed'    AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status IN ('pending','confirmed') AND p_nuevo='cancelled_by_client'       AND (v_is_client OR is_admin()) THEN NULL;
  ELSIF v_b.status IN ('pending','confirmed') AND p_nuevo='cancelled_by_professional' AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status='confirmed'   AND p_nuevo='no_show_client'       AND (v_is_pro OR is_admin()) THEN NULL;
  ELSIF v_b.status='confirmed'   AND p_nuevo='no_show_professional' AND (v_is_client OR is_admin()) THEN NULL;
  ELSIF v_b.status IN ('completed','no_show_client','no_show_professional') AND p_nuevo='disputed' THEN NULL;
  ELSE RAISE EXCEPTION 'INVALID_STATE' USING ERRCODE='P0001'; END IF;
  UPDATE bookings SET status=p_nuevo, updated_at=NOW() WHERE id=p_booking_id RETURNING * INTO v_b;
  PERFORM write_audit('booking_status_change','booking', v_b.id, jsonb_build_object('status',v_old), jsonb_build_object('status',p_nuevo));
  RETURN v_b;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== Reseñas + recálculo de rating =====
CREATE OR REPLACE FUNCTION crear_resena(p_booking_id UUID, p_rating INT, p_comment TEXT) RETURNS reviews AS $$
DECLARE v_b bookings; v_row reviews;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001'; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'INVALID_RATING' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF v_b.id IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF v_b.client_id <> auth.uid() THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
  IF EXISTS (SELECT 1 FROM reviews WHERE booking_id = p_booking_id) THEN RAISE EXCEPTION 'ALREADY_REVIEWED' USING ERRCODE='P0001'; END IF;
  IF v_b.status NOT IN ('completed') THEN RAISE EXCEPTION 'BOOKING_NOT_COMPLETED' USING ERRCODE='P0001'; END IF;
  INSERT INTO reviews(booking_id, client_id, professional_id, rating, comment)
    VALUES (p_booking_id, auth.uid(), v_b.professional_id, p_rating, p_comment) RETURNING * INTO v_row;
  UPDATE bookings SET status='reviewed', updated_at=NOW() WHERE id = p_booking_id;
  PERFORM write_audit('review_created','review', v_row.id, NULL, to_jsonb(v_row));
  RETURN v_row;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION recompute_pro_rating() RETURNS TRIGGER AS $$
DECLARE v_pro UUID;
BEGIN
  v_pro := COALESCE(NEW.professional_id, OLD.professional_id);
  PERFORM set_config('manita.system', 'on', true);
  UPDATE professionals p SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE professional_id = v_pro),0),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE professional_id = v_pro)
  WHERE p.id = v_pro;
  PERFORM set_config('manita.system', 'off', true);
  RETURN NULL;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_recompute_rating ON reviews;
CREATE TRIGGER trg_recompute_rating AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION recompute_pro_rating();

-- ===== RLS (lectura pública de pros activos + disponibilidad) =====
DROP POLICY IF EXISTS "Ver reservas cliente" ON bookings;
CREATE POLICY "Ver reservas cliente" ON bookings FOR SELECT USING (auth.uid() = client_id);
DROP POLICY IF EXISTS "Ver reservas profesional" ON bookings;
CREATE POLICY "Ver reservas profesional" ON bookings FOR SELECT USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));
DROP POLICY IF EXISTS "Profesionales son públicos" ON professionals;
DROP POLICY IF EXISTS "Pros activos públicos" ON professionals;
CREATE POLICY "Pros activos públicos" ON professionals FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Admin edita profesionales" ON professionals;
CREATE POLICY "Admin edita profesionales" ON professionals FOR UPDATE USING (is_admin());
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_time_off ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Disponibilidad pública" ON professional_availability;
CREATE POLICY "Disponibilidad pública" ON professional_availability FOR SELECT USING (TRUE);
-- El dueño del profesional puede crear/editar/borrar SU disponibilidad
DROP POLICY IF EXISTS "Dueño edita disponibilidad" ON professional_availability;
CREATE POLICY "Dueño edita disponibilidad" ON professional_availability FOR ALL
  USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));

-- ===== Trigger de signup A PRUEBA DE FALLOS (fin de "Database error saving user") =====
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NULLIF(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: perfil no creado para %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE OR REPLACE FUNCTION ensure_profile()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.profiles (id) VALUES (auth.uid()) ON CONFLICT (id) DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION ensure_profile() TO authenticated;

-- ============================================================
-- DATOS DEMO: categorías + 12 profesionales + disponibilidad
-- ============================================================
INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES
('limpieza','Limpieza',NULL,'🧹',1),('hogar','Hogar',NULL,'🔨',2),
('belleza','Belleza',NULL,'💅',3),('clases','Clases',NULL,'📚',4),
('mascotas','Mascotas',NULL,'🐕',5),('cuidados','Cuidados',NULL,'🧑‍⚕️',6),
('otros','Otros',NULL,'✨',7)
ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES
('plomeria','Plomería','hogar','🚰',2),('manitas','Manitas','hogar','🔧',1),
('electricista','Electricista','hogar','⚡',3),('mudanzas','Mudanzas y fletes','hogar','📦',4),
('manicura','Manicura y pedicura','belleza','💅',1),('maquillaje','Maquillaje','belleza','💄',2),
('clases-guitarra','Guitarra','clases','🎸',1),('clases-patinaje','Patinaje / Rollers','clases','🛼',3),
('personal-trainer','Personal trainer','clases','🏋️',4),('paseo-perros','Paseo de perros','mascotas','🦮',1),
('cuidado-ninos','Cuidado de niños','cuidados','👶',1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO professionals (category_id, service_name, bio, price, price_unit, zone, rating, reviews_count, verified, available, status, duration_min, buffer_min)
SELECT * FROM (VALUES
  ('limpieza','Limpieza de hogar','Limpieza profunda con productos ecológicos. 5 años de experiencia.',350,'servicio','Roma Norte',0,0,true,true,'active',120,30),
  ('limpieza','Limpieza de oficina','Especialista en oficinas y comercios. Equipo propio.',450,'servicio','Polanco',0,0,true,true,'active',120,30),
  ('manicura','Manicura y pedicura','Uñas acrílicas, gelish y nail art. Materiales premium.',250,'sesión','Condesa',0,0,true,true,'active',90,15),
  ('maquillaje','Maquillaje profesional','Maquillaje para eventos, bodas y sesiones de foto.',800,'sesión','Del Valle',0,0,true,true,'active',90,30),
  ('plomeria','Plomería general','Reparación de fugas, tuberías y calentadores.',400,'visita','Coyoacán',0,0,true,true,'active',60,30),
  ('manitas','Manitas / handyman','Montaje de muebles, colgado de TV, arreglos del hogar.',300,'hora','Narvarte',0,0,true,true,'active',60,30),
  ('clases-guitarra','Clases de guitarra','Guitarra acústica y eléctrica para todos los niveles.',400,'hora','Roma Sur',0,0,true,true,'active',60,15),
  ('clases-patinaje','Clases de patinaje / rollers','Patinaje para niños y adultos. Desde cero.',350,'sesión','Chapultepec',0,0,true,true,'active',60,15),
  ('personal-trainer','Personal trainer','Entrenamiento personalizado a domicilio.',450,'sesión','Escandón',0,0,true,true,'active',60,15),
  ('paseo-perros','Paseo de perros','Paseos de 45 min, cuidado con amor. Fotos incluidas.',150,'paseo','Escandón',0,0,true,true,'active',60,15),
  ('electricista','Electricista','Instalaciones, cortos, contactos y mantenimiento.',400,'visita','Iztacalco',0,0,true,true,'active',60,30),
  ('cuidado-ninos','Cuidado de niños','Niñera con experiencia y primeros auxilios.',250,'hora','Tlalpan',0,0,true,true,'active',120,30)
) AS v(category_id, service_name, bio, price, price_unit, zone, rating, reviews_count, verified, available, status, duration_min, buffer_min)
WHERE NOT EXISTS (SELECT 1 FROM professionals);

INSERT INTO professional_availability (professional_id, weekday, start_time, end_time)
SELECT p.id, d, '08:00'::time, '20:00'::time
FROM professionals p CROSS JOIN generate_series(1,6) d
WHERE NOT EXISTS (SELECT 1 FROM professional_availability a WHERE a.professional_id = p.id);

-- ============================================================
-- LISTO. Debe decir "Success". Faltan 2 cosas manuales:
--
-- 1) HAZTE ADMIN (reemplaza tu correo):
--    UPDATE profiles SET role='admin'
--    WHERE id = (SELECT id FROM auth.users WHERE email='TU_CORREO_AQUI');
--
-- 2) En Authentication -> URL Configuration:
--    Site URL     = https://manita-cdmx.netlify.app
--    Redirect URLs= https://manita-cdmx.netlify.app/**
-- ============================================================
