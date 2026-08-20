-- ============================================================
-- MANITA — SETUP COMPLETO (migraciones 0001–0010 consolidadas)
-- Pega TODO este archivo en Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede re-ejecutar sin romper nada.
-- Después de correrlo, ver "PASOS FINALES" al final del archivo.
-- ============================================================

-- ========== 0001: SCHEMA INICIAL ==========
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT, phone TEXT, avatar_url TEXT,
  is_professional BOOLEAN DEFAULT FALSE,
  city TEXT DEFAULT 'Ciudad de México',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, icon TEXT, sort_order INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  service_name TEXT NOT NULL, bio TEXT, price NUMERIC NOT NULL,
  price_unit TEXT DEFAULT 'servicio', zone TEXT,
  rating NUMERIC DEFAULT 0, reviews_count INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE, available BOOLEAN DEFAULT TRUE,
  avatar_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  service_date DATE NOT NULL, service_time TEXT NOT NULL,
  address TEXT NOT NULL, price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP POLICY IF EXISTS "Categories son públicas" ON categories;
CREATE POLICY "Categories son públicas" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Ver perfil propio" ON profiles;
CREATE POLICY "Ver perfil propio" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Editar perfil propio" ON profiles;
CREATE POLICY "Editar perfil propio" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Crear perfil propio" ON profiles;
CREATE POLICY "Crear perfil propio" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Editar profesional propio" ON professionals;
CREATE POLICY "Editar profesional propio" ON professionals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Crear profesional propio" ON professionals;
CREATE POLICY "Crear profesional propio" ON professionals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Reseñas son públicas" ON reviews;
CREATE POLICY "Reseñas son públicas" ON reviews FOR SELECT USING (true);

-- ========== 0002: ROLES, ESTADOS, DURACIÓN, SNAPSHOT PRECIO ==========
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
UPDATE professionals SET status = 'active' WHERE status = 'pending_review';
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
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_chk;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_chk CHECK (status IN (
  'pending','confirmed','in_progress','completed','reviewed',
  'cancelled_by_client','cancelled_by_professional','no_show_client','no_show_professional','disputed'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_idempotency ON bookings(client_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_chk;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_chk CHECK (payment_status IN ('unpaid','authorized','captured','refunded','partially_refunded','failed'));

-- ========== 0003: PAGOS, AUDITORÍA, WEBHOOKS, NOTIFICACIONES ==========
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago', provider_payment_id TEXT,
  amount NUMERIC NOT NULL, currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'created', raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payments_status_chk CHECK (status IN ('created','authorized','captured','failed','refund_pending','refunded','partially_refunded'))
);
CREATE TABLE IF NOT EXISTS refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, reason TEXT, status TEXT NOT NULL DEFAULT 'pending',
  provider_refund_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT refunds_status_chk CHECK (status IN ('pending','done','failed'))
);
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  gross_amount NUMERIC NOT NULL, platform_fee NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  provider_payout_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payouts_status_chk CHECK (status IN ('pending','processing','paid','failed'))
);
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider TEXT NOT NULL, event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed', received_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider, event_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'email',
  payload JSONB, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor UUID, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
  old_value JSONB, new_value JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payouts_pro ON payouts(professional_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_start ON bookings(professional_id, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_professionals_cat_rating ON professionals(category_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver mis notificaciones" ON notifications;
CREATE POLICY "Ver mis notificaciones" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- ========== 0004: DISPONIBILIDAD + CONCURRENCIA ==========
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

-- ========== 0005: PROTECCIÓN DE COLUMNAS + HELPERS ==========
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

-- ========== 0006: RPCs DE RESERVAS ==========
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

-- ========== 0007: RESEÑAS + RATING REAL ==========
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

-- ========== 0008: RLS CORREGIDO ==========
DROP POLICY IF EXISTS "Crear reserva" ON bookings;
DROP POLICY IF EXISTS "Actualizar reserva propia" ON bookings;
DROP POLICY IF EXISTS "Ver reservas propias (cliente)" ON bookings;
DROP POLICY IF EXISTS "Ver reservas cliente" ON bookings;
DROP POLICY IF EXISTS "Ver reservas profesional" ON bookings;
CREATE POLICY "Ver reservas cliente" ON bookings FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Ver reservas profesional" ON bookings FOR SELECT USING (auth.uid() = (SELECT user_id FROM professionals WHERE id = professional_id));
DROP POLICY IF EXISTS "Profesionales son públicos" ON professionals;
DROP POLICY IF EXISTS "Pros activos públicos" ON professionals;
CREATE POLICY "Pros activos públicos" ON professionals FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Admin edita profesionales" ON professionals;
CREATE POLICY "Admin edita profesionales" ON professionals FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Crear reseña propia" ON reviews;
DROP POLICY IF EXISTS "Admin ve perfiles" ON profiles;
CREATE POLICY "Admin ve perfiles" ON profiles FOR SELECT USING (is_admin());
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_time_off ENABLE ROW LEVEL SECURITY;
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

-- ========== 0009: STORAGE (buckets + policies) ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('avatars','avatars',true,2097152,ARRAY['image/jpeg','image/png','image/webp']),
  ('portfolio','portfolio',true,5242880,ARRAY['image/jpeg','image/png','image/webp']),
  ('service','service',false,5242880,ARRAY['image/jpeg','image/png','image/webp']),
  ('verification','verification',false,5242880,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars','portfolio'));
DROP POLICY IF EXISTS "own_write_public" ON storage.objects;
CREATE POLICY "own_write_public" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own_update_public" ON storage.objects;
CREATE POLICY "own_update_public" ON storage.objects FOR UPDATE USING (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own_delete_public" ON storage.objects;
CREATE POLICY "own_delete_public" ON storage.objects FOR DELETE USING (bucket_id IN ('avatars','portfolio','service','verification') AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "private_read_owner" ON storage.objects;
CREATE POLICY "private_read_owner" ON storage.objects FOR SELECT USING (bucket_id IN ('service','verification') AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));
DROP POLICY IF EXISTS "private_write_owner" ON storage.objects;
CREATE POLICY "private_write_owner" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('service','verification') AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========== 0010: DIRECCIONES DEL CLIENTE ==========
CREATE TABLE IF NOT EXISTS client_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL, address TEXT NOT NULL, colonia TEXT, notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT client_addresses_address_chk CHECK (length(trim(address)) >= 5)
);
CREATE INDEX IF NOT EXISTS idx_client_addresses_user ON client_addresses(user_id);
CREATE OR REPLACE FUNCTION enforce_single_default_address() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN UPDATE client_addresses SET is_default = FALSE WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default = TRUE; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_single_default_address ON client_addresses;
CREATE TRIGGER trg_single_default_address AFTER INSERT OR UPDATE OF is_default ON client_addresses FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION enforce_single_default_address();
ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver mis direcciones" ON client_addresses;
CREATE POLICY "Ver mis direcciones" ON client_addresses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Crear mi direccion" ON client_addresses;
CREATE POLICY "Crear mi direccion" ON client_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Editar mi direccion" ON client_addresses;
CREATE POLICY "Editar mi direccion" ON client_addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Borrar mi direccion" ON client_addresses;
CREATE POLICY "Borrar mi direccion" ON client_addresses FOR DELETE USING (auth.uid() = user_id);

-- ========== 0011: FIX SIGNUP — trigger a prueba de fallos ==========
-- Evita "Database error saving user": si crear el perfil falla, NO se aborta el registro.
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
-- FIN DEL SETUP. Deberías ver "Success. No rows returned".
--
-- PASOS FINALES (hazlos después de correr esto):
-- 1) Marca tu usuario como admin (reemplaza el email):
--      UPDATE profiles SET role='admin'
--      WHERE id = (SELECT id FROM auth.users WHERE email='TU_EMAIL_AQUI');
-- 2) Carga las categorías y profesionales de ejemplo:
--      Ejecuta supabase_schema.sql (solo la parte de INSERT de categorías) y supabase_seed_pros.sql
--      — O usa SEED_DEMO.sql (ver ese archivo).
-- 3) Da disponibilidad a los profesionales de ejemplo (necesario para reservar):
--      INSERT INTO professional_availability(professional_id, weekday, start_time, end_time)
--      SELECT id, d, '08:00','20:00' FROM professionals CROSS JOIN generate_series(1,6) d;
-- 4) En Authentication → URL Configuration:
--      Site URL = https://manita-cdmx.netlify.app
--      Redirect URLs = https://manita-cdmx.netlify.app/**
-- ============================================================
