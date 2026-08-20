// ============================================
// MANITA — Gate 1.5: replica lógica de VERIFY_RLS_STORAGE.sql en PGlite.
// Valida que la LÓGICA de las verificaciones es correcta (RPCs, transiciones,
// triggers, concurrencia con 2 profesionales). NO valida RLS de usuario final
// (eso es NOT RUN hasta Supabase), pero sí confirma el diseño transaccional.
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
  results.push({ name, status });
  const tag = status === 'PASS' ? 'PASS ' : status === 'FAIL' ? 'FAIL ' : 'NOT RUN';
  console.log(`[${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}
const AUTH_STUB = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, raw_user_meta_data JSONB DEFAULT '{}');
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('manita.uid', true), '')::uuid;
$$ LANGUAGE sql STABLE;`;
async function auth(db, uid) { await db.exec(`SELECT set_config('manita.uid', '${uid ?? ''}', false);`); }
async function expectErr(db, sql, code) {
  try { await db.query(sql); return { ok:false, msg:`esperaba ${code}, sin error` }; }
  catch(e){ const m=String(e.message||''); return m.includes(code)?{ok:true}:{ok:false,msg:`esperaba ${code}, obtuvo: ${m}`}; }
}
const alice='11111111-1111-1111-1111-111111111111', bob='22222222-2222-2222-2222-222222222222';
const pro1u='33333333-3333-3333-3333-333333333333', pro2u='55555555-5555-5555-5555-555555555555';
const PRO1='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', PRO2='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const slotA=`(date_trunc('day',now())+interval '2 day'+interval '10 hour')`;

async function main() {
  const db = new PGlite({ extensions:{ btree_gist } });
  await db.exec(AUTH_STUB);
  for (const f of ['0001_init.sql','0002_roles_and_status.sql','0003_payments_notifications.sql',
    '0004_availability_concurrency.sql','0005_protect_columns.sql','0006_booking_rpcs.sql',
    '0007_reviews_rpc.sql','0008_rls.sql']) {
    await db.exec(readFileSync(join(MIG,f),'utf8'));
  }
  await db.exec(`INSERT INTO auth.users(id) VALUES ('${alice}'),('${bob}'),('${pro1u}'),('${pro2u}');
    INSERT INTO categories(id,name) VALUES ('limpieza','Limpieza');
    INSERT INTO professionals(id,user_id,category_id,service_name,price,status,available,duration_min,buffer_min)
      VALUES ('${PRO1}','${pro1u}','limpieza','Limpieza hogar',350,'active',true,60,30),
             ('${PRO2}','${pro2u}','limpieza','Limpieza oficina',450,'active',true,90,30);
    INSERT INTO professional_availability(professional_id,weekday,start_time,end_time)
      SELECT '${PRO1}',d,'08:00','20:00' FROM generate_series(0,6) d;
    INSERT INTO professional_availability(professional_id,weekday,start_time,end_time)
      SELECT '${PRO2}',d,'08:00','20:00' FROM generate_series(0,6) d;`);

  // 6. RPC precio server-side
  await auth(db, alice);
  const r1 = await db.query(`SELECT * FROM crear_reserva('${PRO1}', ${slotA}, 'Calle Falsa 123, CDMX', 'g-alice-1')`);
  record('#6 RPC precio server-side (total=base=350)', (Number(r1.rows[0].total)===350 && Number(r1.rows[0].base_price)===350) ? 'PASS':'FAIL');
  const aliceBooking = r1.rows[0].id;

  // 7. Concurrencia: Bob mismo slot
  await auth(db, bob);
  record('#7 doble slot => SLOT_TAKEN', (await expectErr(db, `SELECT crear_reserva('${PRO1}', ${slotA}, 'x, CDMX', 'g-bob-1')`, 'SLOT_TAKEN')).ok ? 'PASS':'FAIL');

  // 8. cancelar libera slot
  await auth(db, alice);
  await db.query(`SELECT transicion_reserva('${aliceBooking}','cancelled_by_client')`);
  await auth(db, bob);
  let bobBooking=null;
  try { const rr=await db.query(`SELECT * FROM crear_reserva('${PRO1}', ${slotA}, 'Dir Bob, CDMX', 'g-bob-2')`); bobBooking=rr.rows[0].id; record('#8 slot liberado tras cancelar','PASS'); }
  catch(e){ record('#8 slot liberado tras cancelar','FAIL',e.message); }

  // 11. transición inválida
  await auth(db, pro1u);
  await db.query(`SELECT transicion_reserva('${bobBooking}','confirmed')`);
  record('#11 transición inválida (confirmed->reviewed) => INVALID_STATE', (await expectErr(db,`SELECT transicion_reserva('${bobBooking}','reviewed')`,'INVALID_STATE')).ok?'PASS':'FAIL');

  // 12. auto-verificarse
  await auth(db, pro1u);
  await db.query(`UPDATE professionals SET verified=true, rating=5, reviews_count=999 WHERE id='${PRO1}'`);
  const v=await db.query(`SELECT verified,rating,reviews_count FROM professionals WHERE id='${PRO1}'`);
  record('#12 no auto-verificarse', (v.rows[0].verified===false && Number(v.rows[0].rating)===0) ? 'PASS':'FAIL', JSON.stringify(v.rows[0]));

  // 13. no hacerse admin
  await auth(db, alice);
  await db.query(`UPDATE profiles SET role='admin' WHERE id='${alice}'`);
  const rl=await db.query(`SELECT role FROM profiles WHERE id='${alice}'`);
  record('#13 no escalar a admin', rl.rows[0].role==='user'?'PASS':'FAIL', `role=${rl.rows[0].role}`);

  // 15. reseña no completado (bob en confirmed)
  await auth(db, bob);
  record('#15 reseña no-completado => BOOKING_NOT_COMPLETED', (await expectErr(db,`SELECT crear_resena('${bobBooking}',5,'x')`,'BOOKING_NOT_COMPLETED')).ok?'PASS':'FAIL');

  // completar bob
  await auth(db, pro1u);
  await db.query(`SELECT transicion_reserva('${bobBooking}','in_progress')`);
  await db.query(`SELECT transicion_reserva('${bobBooking}','completed')`);

  // 16. reseña ajena (alice sobre booking de bob)
  await auth(db, alice);
  record('#16 reseña ajena => FORBIDDEN', (await expectErr(db,`SELECT crear_resena('${bobBooking}',5,'hack')`,'FORBIDDEN')).ok?'PASS':'FAIL');

  // 17. válida + doble
  await auth(db, bob);
  await db.query(`SELECT crear_resena('${bobBooking}',4,'bien')`);
  record('#17 doble reseña => ALREADY_REVIEWED', (await expectErr(db,`SELECT crear_resena('${bobBooking}',5,'otra')`,'ALREADY_REVIEWED')).ok?'PASS':'FAIL');

  // 18. rating recalculado
  const rt=await db.query(`SELECT rating,reviews_count FROM professionals WHERE id='${PRO1}'`);
  record('#18 rating recalculado (4.00,1)', (Number(rt.rows[0].rating)===4 && rt.rows[0].reviews_count===1)?'PASS':'FAIL', JSON.stringify(rt.rows[0]));

  // 22. audit log
  const au=await db.query(`SELECT count(*)::int n FROM audit_log`);
  record('#22 audit log registra operaciones', au.rows[0].n>=4?'PASS':'FAIL', `eventos=${au.rows[0].n}`);

  // Estructural: bookings sin policy INSERT/UPDATE, reviews sin INSERT
  const pol=await db.query(`SELECT count(*)::int n FROM pg_policies WHERE tablename='bookings' AND cmd IN ('INSERT','UPDATE')`);
  record('#3/#4 bookings sin policy INSERT/UPDATE directa', pol.rows[0].n===0?'PASS':'FAIL', `policies=${pol.rows[0].n}`);
  const polr=await db.query(`SELECT count(*)::int n FROM pg_policies WHERE tablename='reviews' AND cmd='INSERT'`);
  record('#14 reviews sin policy INSERT directa', polr.rows[0].n===0?'PASS':'FAIL', `policies=${polr.rows[0].n}`);

  const pass=results.filter(r=>r.status==='PASS').length, fail=results.filter(r=>r.status==='FAIL').length;
  console.log(`\n===== GATE LÓGICA: ${pass} PASS · ${fail} FAIL =====`);
  console.log('NOTA: RLS de usuario final y Storage = NOT RUN (requiere Supabase).');
  process.exit(fail>0?1:0);
}
main().catch(e=>{console.error('FATAL',e);process.exit(1);});
