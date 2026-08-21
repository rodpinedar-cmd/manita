// ============================================
// MANITA — Tests SQL reproducibles (PGlite = Postgres real en WASM)
// Ejecuta las migraciones y la matriz de ataques. Reporta PASS/FAIL.
// ============================================
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG = join(__dirname, '..', 'supabase', 'migrations');

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail: detail || '' });
  const tag = status === 'PASS' ? 'PASS ' : status === 'FAIL' ? 'FAIL ' : 'NOT RUN';
  console.log(`[${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}

// Simula el entorno Supabase (auth.uid(), auth.users) para poder correr RLS localmente.
const AUTH_STUB = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, raw_user_meta_data JSONB DEFAULT '{}');
-- auth.uid() lee un GUC que fijamos por sesión de prueba
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('manita.uid', true), '')::uuid;
$$ LANGUAGE sql STABLE;
`;

// Aplica una migración, sustituyendo referencias a auth.users que ya existen.
async function applyMigration(db, file) {
  const sql = readFileSync(join(MIG, file), 'utf8');
  await db.exec(sql);
}

// Fija el usuario "autenticado" para las siguientes queries (simula el JWT de Supabase)
async function auth(db, uid) {
  await db.exec(`SELECT set_config('manita.uid', '${uid ?? ''}', false);`);
}

// Helper: espera que una query lance error con un código de negocio concreto
async function expectError(db, sql, code, params) {
  try {
    await db.query(sql, params);
    return { ok: false, msg: `esperaba error ${code}, no hubo error` };
  } catch (e) {
    const m = String(e.message || '');
    if (m.includes(code)) return { ok: true };
    return { ok: false, msg: `esperaba ${code}, obtuvo: ${m}` };
  }
}

const uidAlice = '11111111-1111-1111-1111-111111111111';
const uidBob   = '22222222-2222-2222-2222-222222222222';
const uidProUser = '33333333-3333-3333-3333-333333333333';
const uidAdmin = '44444444-4444-4444-4444-444444444444';

async function main() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(AUTH_STUB);

  // Aplicar migraciones en orden (omitimos 0009_storage: usa esquema storage.* inexistente en PGlite)
  const order = [
    '0001_init.sql','0002_roles_and_status.sql','0003_payments_notifications.sql',
    '0004_availability_concurrency.sql','0005_protect_columns.sql',
    '0006_booking_rpcs.sql','0007_reviews_rpc.sql','0008_rls.sql'
  ];
  try {
    for (const f of order) { await applyMigration(db, f); }
    record('Migraciones 0001-0008 aplican sin error', 'PASS');
  } catch (e) {
    record('Migraciones aplican sin error', 'FAIL', e.message);
    print(); process.exit(1);
  }

  // --- FIXTURES ---
  try {
    // El trigger handle_new_user crea el profile automáticamente al insertar en auth.users
    await db.exec(`
      INSERT INTO auth.users(id) VALUES
        ('${uidAlice}'),('${uidBob}'),('${uidProUser}'),('${uidAdmin}');
      INSERT INTO categories(id,name) VALUES ('limpieza','Limpieza');
    `);
    // Marcar admin: en Supabase esto se hace con service_role (bypassa triggers/RLS).
    // Aquí simulamos ese privilegio desactivando el trigger de protección durante el bootstrap.
    await db.exec(`ALTER TABLE profiles DISABLE TRIGGER trg_protect_profile;`);
    await db.exec(`UPDATE profiles SET role='admin' WHERE id='${uidAdmin}';`);
    await db.exec(`ALTER TABLE profiles ENABLE TRIGGER trg_protect_profile;`);
    // Un profesional propiedad de uidProUser, activo, duración 60min
    await db.exec(`
      INSERT INTO professionals(id, user_id, category_id, service_name, price, status, available, duration_min, buffer_min)
      VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','${uidProUser}','limpieza','Limpieza hogar', 350, 'active', true, 60, 30);
    `);
    // Disponibilidad: todos los días 08:00-20:00
    await db.exec(`
      INSERT INTO professional_availability(professional_id, weekday, start_time, end_time)
      SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', d, '08:00','20:00' FROM generate_series(0,6) d;
    `);
    record('Fixtures cargadas', 'PASS');
  } catch (e) { record('Fixtures cargadas', 'FAIL', e.message); print(); process.exit(1); }

  const PRO = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  // Fecha futura fija a las 10:00 (dentro de disponibilidad)
  const slot = `(date_trunc('day', now()) + interval '2 day' + interval '10 hour')`;

  // ============ TESTS DE NEGOCIO ============

  // T1: crear_reserva calcula precio server-side (snapshot)
  await auth(db, uidAlice);
  let bookingId = null;
  try {
    const r = await db.query(`SELECT * FROM crear_reserva('${PRO}', ${slot}, 'Calle Falsa 123, CDMX', 'idem-alice-1')`);
    const row = r.rows[0];
    bookingId = row.id;
    if (Number(row.base_price) === 350 && Number(row.total) === 350 && Number(row.platform_fee) === 52.5)
      record('T1 precio server-side + snapshot (base=350, fee=52.5)', 'PASS');
    else record('T1 precio server-side + snapshot', 'FAIL', JSON.stringify(row));
  } catch (e) { record('T1 precio server-side', 'FAIL', e.message); }

  // T2: idempotencia de reserva (misma key => misma reserva, no duplica)
  await auth(db, uidAlice);
  try {
    const r = await db.query(`SELECT * FROM crear_reserva('${PRO}', ${slot}, 'Calle Falsa 123, CDMX', 'idem-alice-1')`);
    const cnt = await db.query(`SELECT count(*)::int n FROM bookings WHERE idempotency_key='idem-alice-1'`);
    if (r.rows[0].id === bookingId && cnt.rows[0].n === 1)
      record('T2 idempotencia de reserva (3 clicks = 1 reserva)', 'PASS');
    else record('T2 idempotencia de reserva', 'FAIL', `n=${cnt.rows[0].n}`);
  } catch (e) { record('T2 idempotencia de reserva', 'FAIL', e.message); }

  // T3: DOBLE RESERVA concurrente — Bob intenta el MISMO slot => SLOT_TAKEN
  await auth(db, uidBob);
  {
    const res = await expectError(db, `SELECT crear_reserva('${PRO}', ${slot}, 'Otra dir 456, CDMX', 'idem-bob-1')`, 'SLOT_TAKEN');
    record('T3 doble reserva mismo slot => SLOT_TAKEN', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // T4: fuera de disponibilidad (03:00) => OUTSIDE_AVAILABILITY
  await auth(db, uidBob);
  {
    const night = `(date_trunc('day', now()) + interval '3 day' + interval '3 hour')`;
    const res = await expectError(db, `SELECT crear_reserva('${PRO}', ${night}, 'Dir noche, CDMX', 'idem-bob-night')`, 'OUTSIDE_AVAILABILITY');
    record('T4 fuera de horario => OUTSIDE_AVAILABILITY', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // T4b: DISPONIBILIDAD CON VARIOS RANGOS POR DÍA (horario partido: mañana 08-12 y tarde 16-20)
  // Verifica que el backend acepta reservas en cualquiera de los rangos y rechaza el hueco.
  {
    const PRO2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    // Alta de un pro con horario partido TODOS los días de la semana
    await db.exec(`
      INSERT INTO professionals (id, user_id, category_id, service_name, price, status, available, duration_min, buffer_min)
      VALUES ('${PRO2}','${uidProUser}','limpieza','Limpieza partida', 300, 'active', true, 60, 0)
      ON CONFLICT (id) DO NOTHING;
      DELETE FROM professional_availability WHERE professional_id='${PRO2}';
      INSERT INTO professional_availability(professional_id, weekday, start_time, end_time)
      SELECT '${PRO2}', d, '08:00','12:00' FROM generate_series(0,6) d;
      INSERT INTO professional_availability(professional_id, weekday, start_time, end_time)
      SELECT '${PRO2}', d, '16:00','20:00' FROM generate_series(0,6) d;
    `);
    await auth(db, uidAlice);
    const manana = `(date_trunc('day', now()) + interval '4 day' + interval '9 hour')`;
    const tarde  = `(date_trunc('day', now()) + interval '4 day' + interval '17 hour')`;
    const hueco  = `(date_trunc('day', now()) + interval '4 day' + interval '13 hour')`;
    try {
      await db.query(`SELECT crear_reserva('${PRO2}', ${manana}, 'Dir mañana, CDMX', 'idem-split-am')`);
      record('T4b reserva en rango mañana (08-12) OK', 'PASS');
    } catch (e) { record('T4b reserva en rango mañana', 'FAIL', e.message); }
    try {
      await db.query(`SELECT crear_reserva('${PRO2}', ${tarde}, 'Dir tarde, CDMX', 'idem-split-pm')`);
      record('T4b reserva en rango tarde (16-20) OK', 'PASS');
    } catch (e) { record('T4b reserva en rango tarde', 'FAIL', e.message); }
    const res = await expectError(db, `SELECT crear_reserva('${PRO2}', ${hueco}, 'Dir hueco, CDMX', 'idem-split-gap')`, 'OUTSIDE_AVAILABILITY');
    record('T4b hueco de comida (13:00) => OUTSIDE_AVAILABILITY', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // T5: no autenticado no puede reservar
  await auth(db, null);
  {
    const res = await expectError(db, `SELECT crear_reserva('${PRO}', ${slot}, 'x', 'k')`, 'UNAUTHORIZED');
    record('T5 no autenticado => UNAUTHORIZED', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // ============ ATAQUES RLS / MANIPULACIÓN ============

  // A1: cambiar precio via UPDATE directo — RLS no tiene policy UPDATE en bookings => 0 filas afectadas
  await auth(db, uidAlice);
  try {
    await db.exec('SET LOCAL row_security = on;');
  } catch {}
  // Nota: PGlite corre como superuser; RLS solo aplica a roles no-bypass. Verificamos vía policy presence + RPC-only design.
  // Validación estructural: no existe policy INSERT/UPDATE en bookings
  {
    const pol = await db.query(`SELECT count(*)::int n FROM pg_policies WHERE tablename='bookings' AND cmd IN ('INSERT','UPDATE')`);
    record('A1 bookings sin policy INSERT/UPDATE directa (solo RPC)', pol.rows[0].n === 0 ? 'PASS' : 'FAIL', `policies=${pol.rows[0].n}`);
  }

  // A2: saltar estado (pending -> completed) => INVALID_STATE
  await auth(db, uidProUser);
  {
    const res = await expectError(db, `SELECT transicion_reserva('${bookingId}', 'completed')`, 'INVALID_STATE');
    record('A2 saltar estado pending->completed => INVALID_STATE', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // A3: cliente intenta confirmar (solo pro) => FORBIDDEN o INVALID_STATE (no debe confirmar)
  await auth(db, uidAlice);
  {
    const res = await expectError(db, `SELECT transicion_reserva('${bookingId}', 'confirmed')`, 'INVALID_STATE');
    record('A3 cliente no puede confirmar => INVALID_STATE', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // A4: transicionar reserva ajena => FORBIDDEN
  await auth(db, uidBob);
  {
    const res = await expectError(db, `SELECT transicion_reserva('${bookingId}', 'confirmed')`, 'FORBIDDEN');
    record('A4 tercero transiciona reserva ajena => FORBIDDEN', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // A5: auto-verificarse (pro se pone verified=true) — trigger revierte
  await auth(db, uidProUser);
  try {
    await db.query(`UPDATE professionals SET verified=true, rating=5, reviews_count=999 WHERE id='${PRO}'`);
    const r = await db.query(`SELECT verified, rating, reviews_count FROM professionals WHERE id='${PRO}'`);
    const row = r.rows[0];
    if (row.verified === false && Number(row.rating) === 0 && row.reviews_count === 0)
      record('A5 auto-verificarse/inflar rating => revertido por trigger', 'PASS');
    else record('A5 auto-verificarse', 'FAIL', JSON.stringify(row));
  } catch (e) { record('A5 auto-verificarse', 'FAIL', e.message); }

  // A6: cliente intenta ser admin (role='admin') — trigger revierte
  await auth(db, uidAlice);
  try {
    await db.query(`UPDATE profiles SET role='admin' WHERE id='${uidAlice}'`);
    const r = await db.query(`SELECT role FROM profiles WHERE id='${uidAlice}'`);
    record('A6 cliente -> admin => revertido por trigger', r.rows[0].role === 'user' ? 'PASS' : 'FAIL', `role=${r.rows[0].role}`);
  } catch (e) { record('A6 cliente -> admin', 'FAIL', e.message); }

  // A7: reseña sin booking completado => BOOKING_NOT_COMPLETED
  await auth(db, uidAlice);
  {
    const res = await expectError(db, `SELECT crear_resena('${bookingId}', 5, 'genial')`, 'BOOKING_NOT_COMPLETED');
    record('A7 reseña de booking no completado => BOOKING_NOT_COMPLETED', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // Flujo válido hasta completed para probar reseña y doble reseña
  await auth(db, uidProUser);
  try {
    await db.query(`SELECT transicion_reserva('${bookingId}','confirmed')`);
    await db.query(`SELECT transicion_reserva('${bookingId}','in_progress')`);
    await db.query(`SELECT transicion_reserva('${bookingId}','completed')`);
    const st = await db.query(`SELECT status FROM bookings WHERE id='${bookingId}'`);
    record('Flujo pending->completed persistido', st.rows[0].status === 'completed' ? 'PASS' : 'FAIL', `status=${st.rows[0].status}`);
  } catch (e) { record('Flujo pending->completed persistido', 'FAIL', e.message); }

  // A8: reseña válida + rating recalculado por trigger
  await auth(db, uidAlice);
  try {
    await db.query(`SELECT crear_resena('${bookingId}', 4, 'muy bien')`);
    const r = await db.query(`SELECT rating, reviews_count FROM professionals WHERE id='${PRO}'`);
    if (Number(r.rows[0].rating) === 4 && r.rows[0].reviews_count === 1)
      record('A8 reseña válida => rating real recalculado (4, 1)', 'PASS');
    else record('A8 reseña válida', 'FAIL', JSON.stringify(r.rows[0]));
  } catch (e) { record('A8 reseña válida', 'FAIL', e.message); }

  // A9: doble reseña => ALREADY_REVIEWED
  await auth(db, uidAlice);
  {
    const res = await expectError(db, `SELECT crear_resena('${bookingId}', 5, 'otra')`, 'ALREADY_REVIEWED');
    record('A9 doble reseña => ALREADY_REVIEWED', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // A10: reseñar booking ajeno => FORBIDDEN (Bob reseña booking de Alice)
  await auth(db, uidBob);
  {
    const res = await expectError(db, `SELECT crear_resena('${bookingId}', 1, 'hack')`, 'FORBIDDEN');
    record('A10 reseñar booking ajeno => FORBIDDEN', res.ok ? 'PASS' : 'FAIL', res.msg);
  }

  // A11: slot liberado tras cancelación — nueva reserva en el mismo horario debe permitirse
  // Creamos slot2, reservamos, cancelamos, y volvemos a reservar el mismo horario.
  const slot2 = `(date_trunc('day', now()) + interval '5 day' + interval '12 hour')`;
  await auth(db, uidAlice);
  let b2 = null;
  try {
    const r = await db.query(`SELECT * FROM crear_reserva('${PRO}', ${slot2}, 'Dir cancelable, CDMX', 'idem-cancel')`);
    b2 = r.rows[0].id;
    await db.query(`SELECT transicion_reserva('${b2}','cancelled_by_client')`);
    // Bob reserva el mismo horario ahora liberado
    await auth(db, uidBob);
    const r2 = await db.query(`SELECT * FROM crear_reserva('${PRO}', ${slot2}, 'Dir bob, CDMX', 'idem-bob-2')`);
    record('A11 slot liberado tras cancelación => reservable de nuevo', r2.rows[0].id ? 'PASS' : 'FAIL');
  } catch (e) { record('A11 slot liberado tras cancelación', 'FAIL', e.message); }

  // A12: admin SÍ puede verificar profesional (y queda auditado)
  await auth(db, uidAdmin);
  try {
    await db.query(`UPDATE professionals SET verified=true WHERE id='${PRO}'`);
    const r = await db.query(`SELECT verified FROM professionals WHERE id='${PRO}'`);
    const a = await db.query(`SELECT count(*)::int n FROM audit_log WHERE action='pro_verified'`);
    record('A12 admin verifica profesional + audit log', (r.rows[0].verified === true && a.rows[0].n >= 1) ? 'PASS' : 'FAIL', `verified=${r.rows[0].verified}, audit=${a.rows[0].n}`);
  } catch (e) { record('A12 admin verifica', 'FAIL', e.message); }

  // A13: audit log registró creación y cambios de estado del booking
  {
    const r = await db.query(`SELECT count(*)::int n FROM audit_log WHERE entity_type='booking' AND entity_id='${bookingId}'`);
    record('A13 audit log de booking (creación + transiciones)', r.rows[0].n >= 4 ? 'PASS' : 'FAIL', `eventos=${r.rows[0].n}`);
  }

  print();
  const failed = results.filter(r => r.status === 'FAIL').length;
  process.exit(failed > 0 ? 1 : 0);
}

function print() {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n===== RESUMEN: ${pass} PASS · ${fail} FAIL · ${results.length} total =====`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
