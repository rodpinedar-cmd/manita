-- ============================================================
-- MANITA — VERIFY_RLS_STORAGE.sql
-- Verificación del Security/Transaction Gate 1.5 contra SUPABASE REAL.
-- Ejerce RLS COMO USUARIO FINAL (rol 'authenticated'), no como service_role.
--
-- CÓMO EJECUTAR:
--   Opción A (recomendada): psql con la connection string del proyecto.
--   Opción B: SQL Editor de Supabase, bloque por bloque.
--
-- IMPORTANTE:
--   - El SQL Editor corre como service_role y BYPASSA RLS. Para probar RLS de verdad
--     usamos: SET LOCAL role = 'authenticated'; y fijamos el claim del JWT con set_config.
--   - Cada prueba imprime EXPECTED vs OBSERVED. Tú comparas y marcas PASS/FAIL en
--     GO_NO_GO_GATE_1_5.md. Si un bloque no se puede ejecutar, márcalo NOT RUN.
--   - Ejecutar en un proyecto de STAGING o tras BACKUP. Crea y borra datos de prueba.
-- ============================================================

-- ------------------------------------------------------------
-- Helper para simular un usuario autenticado dentro de una transacción.
-- Uso: SELECT set_auth('<uuid>');  (o set_auth(NULL) para anónimo)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._set_auth(p_uid TEXT) RETURNS void AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  IF p_uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{}', true);
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role','authenticated')::text, true);
  END IF;
END; $$ LANGUAGE plpgsql;
-- NOTA: en Supabase, auth.uid() lee request.jwt.claims->>'sub'. Este helper lo emula.

-- ============================================================
-- SETUP DE FIXTURES (como service_role / superadmin)
-- ============================================================
DO $$
DECLARE
  v_alice UUID := '11111111-1111-1111-1111-111111111111';
  v_bob   UUID := '22222222-2222-2222-2222-222222222222';
  v_prouser1 UUID := '33333333-3333-3333-3333-333333333333';
  v_prouser2 UUID := '55555555-5555-5555-5555-555555555555';
BEGIN
  -- Estos usuarios deben existir en auth.users. En un proyecto real, créalos vía
  -- Authentication > Users, o con la API admin. Aquí asumimos que existen.
  RAISE NOTICE 'Asegúrate de que los usuarios de prueba existen en auth.users:';
  RAISE NOTICE '  alice=%, bob=%, pro1=%, pro2=%', v_alice, v_bob, v_prouser1, v_prouser2;
END $$;

-- Categoría + dos profesionales (uno por cada pro-user), activos y con disponibilidad
INSERT INTO categories(id,name) VALUES ('limpieza','Limpieza') ON CONFLICT (id) DO NOTHING;

-- Profesional 1 (dueño = pro-user 1)
INSERT INTO professionals(id, user_id, category_id, service_name, price, status, available, duration_min, buffer_min)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333','limpieza','Limpieza hogar',350,'active',true,60,30)
ON CONFLICT (id) DO UPDATE SET status='active', available=true;

-- Profesional 2 (dueño = pro-user 2)
INSERT INTO professionals(id, user_id, category_id, service_name, price, status, available, duration_min, buffer_min)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','55555555-5555-5555-5555-555555555555','limpieza','Limpieza oficina',450,'active',true,90,30)
ON CONFLICT (id) DO UPDATE SET status='active', available=true;

-- Disponibilidad de ambos: todos los días 08:00-20:00
INSERT INTO professional_availability(professional_id, weekday, start_time, end_time)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', d, '08:00','20:00' FROM generate_series(0,6) d
ON CONFLICT DO NOTHING;
INSERT INTO professional_availability(professional_id, weekday, start_time, end_time)
SELECT 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', d, '08:00','20:00' FROM generate_series(0,6) d
ON CONFLICT DO NOTHING;

-- ============================================================
-- BLOQUE RLS / TRANSACCIONAL
-- Cada prueba va en su propia transacción para aislar el rol.
-- Lee los NOTICE/salidas y compara con EXPECTED.
-- ============================================================

-- ---- 1. Cliente puede leer SUS bookings ----
-- Primero Alice crea una reserva (vía RPC) — start_at futuro dentro de disponibilidad.
BEGIN;
  SELECT public._set_auth('11111111-1111-1111-1111-111111111111');
  SELECT id AS alice_booking_id, base_price, platform_fee, total, status, payment_status
  FROM crear_reserva('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                     date_trunc('day', now()) + interval '2 day' + interval '10 hour',
                     'Calle Falsa 123, CDMX', 'verify-alice-1');
  -- EXPECTED: devuelve una fila. base_price=350, platform_fee=52.50, total=350, status=pending, payment_status=unpaid
  SELECT count(*) AS alice_ve_sus_bookings FROM bookings WHERE client_id = '11111111-1111-1111-1111-111111111111';
  -- EXPECTED: >= 1
COMMIT;

-- ---- 2. Cliente NO puede leer bookings AJENOS ----
BEGIN;
  SELECT public._set_auth('22222222-2222-2222-2222-222222222222'); -- Bob
  SELECT count(*) AS bob_ve_bookings_de_alice
  FROM bookings WHERE client_id = '11111111-1111-1111-1111-111111111111';
  -- EXPECTED: 0  (RLS oculta los de Alice)
COMMIT;

-- ---- 3. Cliente NO puede MODIFICAR bookings directamente ----
BEGIN;
  SELECT public._set_auth('11111111-1111-1111-1111-111111111111');
  -- Intento de UPDATE directo (no hay policy UPDATE => 0 filas afectadas)
  WITH upd AS (
    UPDATE bookings SET status='completed' WHERE client_id='11111111-1111-1111-1111-111111111111' RETURNING 1
  ) SELECT count(*) AS filas_modificadas_directo FROM upd;
  -- EXPECTED: 0
COMMIT;

-- ---- 4. Cliente NO puede INSERTAR bookings saltándose el RPC ----
BEGIN;
  SELECT public._set_auth('11111111-1111-1111-1111-111111111111');
  -- Debe fallar (no hay policy INSERT). Captura el error.
  DO $$
  BEGIN
    INSERT INTO bookings(client_id, professional_id, service_date, service_time, address, price, status, payment_status)
    VALUES ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, '10:00','x',1,'pending','unpaid');
    RAISE NOTICE 'RESULT 4: INSERT DIRECTO PERMITIDO (FAIL esperado DENIED)';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'RESULT 4: INSERT DIRECTO DENEGADO (PASS) -> %', SQLERRM;
  END $$;
  -- EXPECTED: DENEGADO
COMMIT;

-- ---- 5-6. Manipular precio: el RPC ignora cualquier precio del cliente ----
-- El RPC crear_reserva NO acepta parámetro de precio: es imposible enviarlo.
-- Verificación: el total de la reserva de Alice == price del profesional (350), no un valor arbitrario.
BEGIN;
  SELECT public._set_auth('11111111-1111-1111-1111-111111111111');
  SELECT b.total, b.base_price, p.price AS precio_pro_actual
  FROM bookings b JOIN professionals p ON p.id=b.professional_id
  WHERE b.client_id='11111111-1111-1111-1111-111111111111' LIMIT 1;
  -- EXPECTED: total=base_price=precio_pro_actual=350 (precio server-side, no manipulable)
COMMIT;

-- ---- 7. Concurrencia: Bob intenta el MISMO slot que Alice ----
BEGIN;
  SELECT public._set_auth('22222222-2222-2222-2222-222222222222');
  DO $$
  BEGIN
    PERFORM crear_reserva('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                          date_trunc('day', now()) + interval '2 day' + interval '10 hour',
                          'Otra dir 456, CDMX', 'verify-bob-1');
    RAISE NOTICE 'RESULT 7: SEGUNDA RESERVA PERMITIDA (FAIL esperado SLOT_TAKEN)';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'RESULT 7: %  (PASS si dice SLOT_TAKEN)', SQLERRM;
  END $$;
COMMIT;

-- ---- 8. Slot cancelado vuelve a estar disponible ----
BEGIN;
  SELECT public._set_auth('11111111-1111-1111-1111-111111111111');
  -- Alice cancela su reserva
  DO $$
  DECLARE v_id UUID;
  BEGIN
    SELECT id INTO v_id FROM bookings WHERE client_id='11111111-1111-1111-1111-111111111111' AND idempotency_key='verify-alice-1';
    PERFORM transicion_reserva(v_id, 'cancelled_by_client');
    RAISE NOTICE 'RESULT 8a: Alice canceló %', v_id;
  END $$;
COMMIT;
BEGIN;
  SELECT public._set_auth('22222222-2222-2222-2222-222222222222');
  DO $$
  BEGIN
    PERFORM crear_reserva('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                          date_trunc('day', now()) + interval '2 day' + interval '10 hour',
                          'Dir Bob liberado, CDMX', 'verify-bob-2');
    RAISE NOTICE 'RESULT 8b: Bob reservó el slot liberado (PASS)';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'RESULT 8b: FALLÓ (FAIL) -> %', SQLERRM;
  END $$;
COMMIT;

-- ---- 9. Profesional puede ver SUS bookings ----
BEGIN;
  SELECT public._set_auth('33333333-3333-3333-3333-333333333333'); -- pro1
  SELECT count(*) AS pro1_ve_sus_bookings
  FROM bookings WHERE professional_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- EXPECTED: >= 1 (la reserva de Bob del slot liberado)
COMMIT;

-- ---- 10. Profesional NO puede ver bookings de OTRO profesional ----
BEGIN;
  SELECT public._set_auth('55555555-5555-5555-5555-555555555555'); -- pro2
  SELECT count(*) AS pro2_ve_bookings_de_pro1
  FROM bookings WHERE professional_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- EXPECTED: 0
COMMIT;

-- ---- 11. Profesional solo transiciones permitidas (pro1 confirma su booking) ----
BEGIN;
  SELECT public._set_auth('33333333-3333-3333-3333-333333333333');
  DO $$
  DECLARE v_id UUID;
  BEGIN
    SELECT id INTO v_id FROM bookings WHERE professional_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND status='pending' LIMIT 1;
    PERFORM transicion_reserva(v_id, 'confirmed');           -- permitido
    RAISE NOTICE 'RESULT 11a: confirmar PASS';
    BEGIN
      PERFORM transicion_reserva(v_id, 'reviewed');          -- NO permitido
      RAISE NOTICE 'RESULT 11b: transición inválida PERMITIDA (FAIL)';
    EXCEPTION WHEN others THEN RAISE NOTICE 'RESULT 11b: %  (PASS si INVALID_STATE)', SQLERRM; END;
  END $$;
COMMIT;

-- ---- 12. Profesional NO puede auto-verificarse ----
BEGIN;
  SELECT public._set_auth('33333333-3333-3333-3333-333333333333');
  UPDATE professionals SET verified=true, rating=5, reviews_count=999 WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  SELECT verified, rating, reviews_count FROM professionals WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- EXPECTED: verified=false, rating=0 (o real), reviews_count real — NO 5/999
COMMIT;

-- ---- 13. Cliente/Profesional NO puede hacerse admin ----
BEGIN;
  SELECT public._set_auth('11111111-1111-1111-1111-111111111111');
  UPDATE profiles SET role='admin', suspended=false WHERE id='11111111-1111-1111-1111-111111111111';
  SELECT role FROM profiles WHERE id='11111111-1111-1111-1111-111111111111';
  -- EXPECTED: role='user'
COMMIT;

-- ---- 14-17. Reseñas: sin booking / no completado / ajeno / doble ----
-- 14. reseña de booking no completado (el de Bob está en 'confirmed')
BEGIN;
  SELECT public._set_auth('22222222-2222-2222-2222-222222222222');
  DO $$
  DECLARE v_id UUID;
  BEGIN
    SELECT id INTO v_id FROM bookings WHERE client_id='22222222-2222-2222-2222-222222222222' LIMIT 1;
    BEGIN PERFORM crear_resena(v_id,5,'x'); RAISE NOTICE 'RESULT 14: reseña no-completado PERMITIDA (FAIL)';
    EXCEPTION WHEN others THEN RAISE NOTICE 'RESULT 14: % (PASS si BOOKING_NOT_COMPLETED)', SQLERRM; END;
  END $$;
COMMIT;

-- 15/16/17. Completar el booking de Bob y probar ajeno + doble
BEGIN;
  SELECT public._set_auth('33333333-3333-3333-3333-333333333333'); -- pro1 avanza
  DO $$
  DECLARE v_id UUID;
  BEGIN
    SELECT id INTO v_id FROM bookings WHERE professional_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND status='confirmed' LIMIT 1;
    PERFORM transicion_reserva(v_id,'in_progress');
    PERFORM transicion_reserva(v_id,'completed');
    RAISE NOTICE 'RESULT 15setup: booking de Bob completado %', v_id;
  END $$;
COMMIT;
BEGIN;
  SELECT public._set_auth('11111111-1111-1111-1111-111111111111'); -- Alice intenta reseñar booking de Bob (ajeno)
  DO $$
  DECLARE v_id UUID;
  BEGIN
    SELECT id INTO v_id FROM bookings WHERE client_id='22222222-2222-2222-2222-222222222222' AND status='completed' LIMIT 1;
    BEGIN PERFORM crear_resena(v_id,5,'hack'); RAISE NOTICE 'RESULT 16: reseña ajena PERMITIDA (FAIL)';
    EXCEPTION WHEN others THEN RAISE NOTICE 'RESULT 16: % (PASS si FORBIDDEN)', SQLERRM; END;
  END $$;
COMMIT;
BEGIN;
  SELECT public._set_auth('22222222-2222-2222-2222-222222222222'); -- Bob reseña el suyo (válido) + intento doble
  DO $$
  DECLARE v_id UUID;
  BEGIN
    SELECT id INTO v_id FROM bookings WHERE client_id='22222222-2222-2222-2222-222222222222' AND status='completed' LIMIT 1;
    PERFORM crear_resena(v_id,4,'muy bien'); RAISE NOTICE 'RESULT 17a: reseña válida PASS';
    BEGIN PERFORM crear_resena(v_id,5,'otra'); RAISE NOTICE 'RESULT 17b: doble reseña PERMITIDA (FAIL)';
    EXCEPTION WHEN others THEN RAISE NOTICE 'RESULT 17b: % (PASS si ALREADY_REVIEWED)', SQLERRM; END;
  END $$;
COMMIT;

-- ---- 18. Rating/reviews_count recalculados ----
BEGIN;
  SELECT rating, reviews_count FROM professionals WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- EXPECTED: rating=4.00, reviews_count=1
COMMIT;

-- ---- 22. Audit log registró operaciones sensibles ----
BEGIN;
  SELECT action, count(*) FROM audit_log GROUP BY action ORDER BY action;
  -- EXPECTED: filas para booking_created, booking_status_change, review_created (y pro_verified si admin actuó)
COMMIT;

-- ---- 24. Errores no exponen SQL interno ----
-- Verifica manualmente que los SQLERRM impresos arriba son códigos de negocio
-- (SLOT_TAKEN, INVALID_STATE, BOOKING_NOT_COMPLETED, FORBIDDEN, ALREADY_REVIEWED)
-- y NO stack traces de Postgres ni nombres internos de tablas/columnas.

-- ============================================================
-- STORAGE (19-21): PRUEBA MANUAL EN SUPABASE (no automatizable en SQL puro)
-- Ver GO_NO_GO_GATE_1_5.md sección Storage.
-- ============================================================

-- ---- LIMPIEZA de datos de prueba (ejecutar como service_role) ----
-- DELETE FROM reviews WHERE professional_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- DELETE FROM bookings WHERE professional_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- DELETE FROM professional_availability WHERE professional_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- DELETE FROM professionals WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- DROP FUNCTION public._set_auth(TEXT);
