// MANITA — Tests de client_addresses (migración 0010) en Postgres real (PGlite)
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG = join(__dirname, '..', 'supabase', 'migrations');
const results = [];
function rec(n, ok, d){ results.push({n,ok}); console.log(`[${ok?'PASS':'FAIL'}] ${n}${d?' — '+d:''}`); }
const AUTH = `CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users(id UUID PRIMARY KEY, raw_user_meta_data JSONB DEFAULT '{}');
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$ SELECT NULLIF(current_setting('manita.uid',true),'')::uuid $$ LANGUAGE sql STABLE;`;
const alice='11111111-1111-1111-1111-111111111111';

async function main(){
  const db = new PGlite({ extensions:{ btree_gist } });
  await db.exec(AUTH);
  for (const f of ['0001_init.sql','0002_roles_and_status.sql','0003_payments_notifications.sql',
    '0004_availability_concurrency.sql','0005_protect_columns.sql','0006_booking_rpcs.sql',
    '0007_reviews_rpc.sql','0008_rls.sql','0010_client_addresses.sql']) {
    await db.exec(readFileSync(join(MIG,f),'utf8'));
  }
  rec('Migración 0010 aplica', true);
  await db.exec(`INSERT INTO auth.users(id) VALUES ('${alice}')`);
  await db.exec(`SELECT set_config('manita.uid','${alice}',false)`);

  // Insertar 2 direcciones, la segunda default
  await db.query(`INSERT INTO client_addresses(user_id,label,address,is_default) VALUES ('${alice}','Casa','Calle Uno 100, CDMX',true)`);
  await db.query(`INSERT INTO client_addresses(user_id,label,address,is_default) VALUES ('${alice}','Oficina','Av Dos 200, CDMX',true)`);
  const d = await db.query(`SELECT count(*)::int n FROM client_addresses WHERE user_id='${alice}' AND is_default=true`);
  rec('Solo una dirección default por usuario', d.rows[0].n===1, `defaults=${d.rows[0].n}`);

  // Constraint de dirección mínima
  let ok=false;
  try { await db.query(`INSERT INTO client_addresses(user_id,label,address) VALUES ('${alice}','X','abc')`); }
  catch { ok=true; }
  rec('Dirección <5 chars rechazada', ok);

  // RLS estructural: policies presentes para las 4 operaciones
  const pol = await db.query(`SELECT count(*)::int n FROM pg_policies WHERE tablename='client_addresses'`);
  rec('client_addresses tiene RLS (4 policies)', pol.rows[0].n===4, `policies=${pol.rows[0].n}`);

  const fail=results.filter(r=>!r.ok).length;
  console.log(`\n===== ADDRESSES: ${results.length-fail} PASS / ${fail} FAIL =====`);
  process.exit(fail>0?1:0);
}
main().catch(e=>{console.error('FATAL',e);process.exit(1);});
