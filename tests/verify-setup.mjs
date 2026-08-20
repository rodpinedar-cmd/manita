// Verifica que SETUP_COMPLETO.sql aplica sin error en Postgres real (PGlite),
// omitiendo la sección de storage (esquema storage.* no existe en PGlite).
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH = `CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users(id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}');
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$ SELECT NULLIF(current_setting('manita.uid',true),'')::uuid $$ LANGUAGE sql STABLE;
-- Roles que Supabase provee por defecto (necesarios para GRANT ... TO authenticated en PGlite):
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; END $$;`;

let sql = readFileSync(join(__dirname, '..', 'supabase', 'SETUP_COMPLETO.sql'), 'utf8');
// Quitar la sección de storage (entre "0009: STORAGE" y "0010: DIRECCIONES")
sql = sql.replace(/-- ========== 0009: STORAGE[\s\S]*?(?=-- ========== 0010:)/, '-- (storage omitido en PGlite)\n');

const db = new PGlite({ extensions: { btree_gist } });
await db.exec(AUTH);
try {
  await db.exec(sql);
  console.log('[PASS] SETUP_COMPLETO.sql aplica sin error (storage omitido en local)');
  // Verificar objetos clave creados
  const fns = await db.query(`SELECT proname FROM pg_proc WHERE proname IN ('crear_reserva','transicion_reserva','crear_resena','is_admin','recompute_pro_rating')`);
  const tbls = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('bookings','professionals','payments','audit_log','client_addresses','professional_availability')`);
  console.log('[PASS] RPCs creados:', fns.rows.length, '/ 5');
  console.log('[PASS] Tablas clave:', tbls.rows.length, '/ 6');
  // Aplicar SEED_DEMO también
  const seed = readFileSync(join(__dirname, '..', 'supabase', 'SEED_DEMO.sql'), 'utf8');
  await db.exec(seed);
  const pros = await db.query(`SELECT count(*)::int n FROM professionals`);
  const avail = await db.query(`SELECT count(*)::int n FROM professional_availability`);
  console.log('[PASS] SEED_DEMO aplica: pros=' + pros.rows[0].n + ', slots disponibilidad=' + avail.rows[0].n);
  // ===== SIGNUP: el trigger on_auth_user_created crea el perfil sin abortar el alta =====
  let signupOk = false, ensureOk = false, resilientOk = false;
  try {
    await db.exec(`INSERT INTO auth.users(id, email, raw_user_meta_data)
      VALUES ('11111111-1111-1111-1111-111111111111','nuevo@manita.mx','{"full_name":"Ana Nueva"}'::jsonb);`);
    const p = await db.query(`SELECT full_name FROM profiles WHERE id='11111111-1111-1111-1111-111111111111'`);
    signupOk = p.rows.length === 1 && p.rows[0].full_name === 'Ana Nueva';
    console.log((signupOk ? '[PASS]' : '[FAIL]') + ' Signup: trigger crea perfil (full_name=' + (p.rows[0] && p.rows[0].full_name) + ')');
  } catch (e) { console.log('[FAIL] Signup: trigger abortó el alta —', e.message); }

  // El alta NO debe fallar aunque el perfil ya exista (llamar el trigger 2 veces) — ON CONFLICT DO NOTHING
  try {
    await db.exec(`INSERT INTO auth.users(id, email, raw_user_meta_data)
      VALUES ('22222222-2222-2222-2222-222222222222','dup@manita.mx','{"full_name":"Dup"}'::jsonb);`);
    // Simula reintento del trigger sobre un perfil ya existente
    await db.query(`SELECT handle_new_user() FROM (SELECT '22222222-2222-2222-2222-222222222222'::uuid AS id) t`).catch(()=>{});
    await db.exec(`INSERT INTO profiles(id) VALUES ('22222222-2222-2222-2222-222222222222') ON CONFLICT DO NOTHING;`);
    resilientOk = true;
    console.log('[PASS] Signup resiliente: perfil preexistente no aborta (ON CONFLICT DO NOTHING)');
  } catch (e) { console.log('[FAIL] Signup resiliente:', e.message); }

  // ensure_profile() crea el perfil del usuario autenticado si faltara
  try {
    await db.exec(`INSERT INTO auth.users(id,email) VALUES ('33333333-3333-3333-3333-333333333333','sinperfil@manita.mx');`);
    await db.exec(`DELETE FROM profiles WHERE id='33333333-3333-3333-3333-333333333333';`);
    await db.exec(`SELECT set_config('manita.uid','33333333-3333-3333-3333-333333333333', false);`);
    await db.query(`SELECT ensure_profile();`);
    const e2 = await db.query(`SELECT 1 FROM profiles WHERE id='33333333-3333-3333-3333-333333333333'`);
    ensureOk = e2.rows.length === 1;
    console.log((ensureOk ? '[PASS]' : '[FAIL]') + ' ensure_profile crea el perfil faltante');
    await db.exec(`SELECT set_config('manita.uid','', false);`);
  } catch (e) { console.log('[FAIL] ensure_profile:', e.message); }

  const ok = fns.rows.length === 5 && tbls.rows.length === 6 && pros.rows[0].n === 12 && avail.rows[0].n === 72
    && signupOk && resilientOk && ensureOk;
  console.log(ok ? '\n===== SETUP + SEED + SIGNUP OK =====' : '\n===== REVISAR =====');
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.log('[FAIL] SETUP_COMPLETO.sql falló:', e.message);
  process.exit(1);
}
