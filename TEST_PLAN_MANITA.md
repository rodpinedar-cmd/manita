# TEST PLAN — Manita (Fase 1.5)

Tests SQL reproducibles sobre **Postgres real** (PGlite en Node). Ejecutar:
```
cd tests && npm install && node run-tests.mjs
```
PGlite es Postgres compilado a WASM: ejecuta el mismo SQL que Supabase (salvo el esquema `storage.*`, que solo existe en Supabase y se prueba manualmente).

## Estado de ejecución (última corrida)
**21 PASS · 0 FAIL** — ejecutado localmente contra PGlite.

## Cobertura y limitaciones
- ✅ Lógica de RPCs, triggers, constraints, máquina de estados, snapshot de precio, idempotencia, concurrencia (constraint EXCLUDE), auditoría.
- ⚠️ **RLS no se ejerce como usuario final en PGlite** (corre como superuser, que bypassa RLS). La seguridad de RLS se valida **estructuralmente** (ausencia de policies INSERT/UPDATE en bookings) + por diseño (todo vía RPC SECURITY DEFINER). **La verificación de RLS contra roles reales queda NOT RUN hasta ejecutar en Supabase** (ver sección Supabase).
- ⚠️ Storage (0009): NOT RUN local. Requiere Supabase.
- ⚠️ Webhooks de pago: NOT RUN. Edge Functions no existen aún (Fase 2).

## Matriz de ataques (regla P)

| # | Ataque | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Cambiar precio (enviarlo desde cliente) | DENIED — precio server-side | **PASS** (T1: precio calculado en RPC; cliente no lo envía) |
| 2 | Cambiar professional_id de una reserva ajena | DENIED | **PASS** (A4: transición ajena → FORBIDDEN; sin UPDATE directo A1) |
| 3 | Ver booking ajeno | DENIED | **NOT RUN** en PGlite (RLS); validar en Supabase |
| 4 | Modificar booking ajeno | DENIED | **PASS** (A4 FORBIDDEN + A1 sin policy UPDATE) |
| 5 | Cambiar verified | DENIED | **PASS** (A5 revertido por trigger) |
| 6 | Cambiar rating | DENIED | **PASS** (A5 revertido; solo trigger de sistema lo recalcula) |
| 7 | Crear review sin booking | DENIED | **PASS** (A7/A10 FORBIDDEN/estado) |
| 8 | Crear review de booking no completado | DENIED | **PASS** (A7 BOOKING_NOT_COMPLETED) |
| 9 | Crear dos reviews | DENIED | **PASS** (A9 ALREADY_REVIEWED) |
| 10 | Saltar estado | DENIED | **PASS** (A2 INVALID_STATE) |
| 11 | Crear doble reserva (mismo slot) | DENIED | **PASS** (T3 SLOT_TAKEN vía constraint EXCLUDE) |
| 12 | Cambiar role a admin | DENIED | **PASS** (A6 revertido por trigger) |
| 13 | Acceder a documentos privados (verification) | DENIED | **NOT RUN** (Storage; validar en Supabase) |
| 14 | Repetir request de reserva (doble submit) | IDEMPOTENT | **PASS** (T2: misma idempotency_key → 1 reserva) |
| 15 | Repetir webhook | IDEMPOTENT | **NOT RUN** (Edge Function no implementada; tabla payment_webhook_events lista) |

## Tests de negocio adicionales (ejecutados)
- **T4** Reserva fuera de horario → OUTSIDE_AVAILABILITY — PASS
- **T5** Reserva sin sesión → UNAUTHORIZED — PASS
- **A3** Cliente intenta confirmar (acción de pro) → INVALID_STATE — PASS
- **A8** Reseña válida → rating recalculado real (4.00, 1 reseña) — PASS
- **A11** Slot liberado tras cancelación → reservable de nuevo — PASS
- **A12** Admin verifica profesional + queda en audit_log — PASS
- **A13** Audit log registra creación + transiciones de booking (≥4 eventos) — PASS

## Bugs encontrados y corregidos durante el testing (regla O: no razonar, ejecutar)
1. **Trigger de protección bloqueaba el recálculo legítimo de rating.** `recompute_pro_rating` (sistema) hacía UPDATE de rating, pero `protect_professional_columns` lo revertía porque el actor era el cliente. **Fix:** bypass del trigger con `manita.system='on'` fijado por la función de sistema.
2. **Orden de validación en `crear_resena`.** Comprobaba `BOOKING_NOT_COMPLETED` antes que `ALREADY_REVIEWED`; tras reseñar el booking pasa a `reviewed`, dando el error equivocado. **Fix:** comprobar reseña existente primero.
3. **`btree_gist` ausente en PGlite base.** **Fix:** cargar extensión contrib.
4. **Trigger `handle_new_user` duplicaba fixtures.** **Fix:** dejar que el trigger cree el perfil; solo UPDATE de rol admin (con bypass de service_role simulado).

## Pruebas manuales pendientes en Supabase (NOT RUN aquí)
Ejecutar tras aplicar migraciones, autenticado como usuarios reales:
1. Cliente A ve solo sus reservas (RLS). Cliente B no ve las de A.
2. Profesional ve las reservas que recibe (RLS policy dedicada).
3. Subir documento a bucket `verification`; otro usuario NO puede leerlo (URL firmada).
4. Doble submit real desde la UI (triple click en Reservar) → 1 sola reserva.
5. Dos navegadores reservando el mismo slot casi simultáneamente → uno SLOT_TAKEN.
