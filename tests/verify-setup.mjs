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
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$ SELECT NULLIF(current_setting('manita.uid',true),'')::uuid $$ LANGUAGE sql STABLE;`;

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
  const ok = fns.rows.length === 5 && tbls.rows.length === 6 && pros.rows[0].n === 12 && avail.rows[0].n === 72;
  console.log(ok ? '\n===== SETUP + SEED OK =====' : '\n===== REVISAR =====');
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.log('[FAIL] SETUP_COMPLETO.sql falló:', e.message);
  process.exit(1);
}
