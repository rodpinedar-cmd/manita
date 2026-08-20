# GO / NO-GO — Security & Transaction Gate 1.5

> Este gate debe estar **100% verde** antes de escribir una sola línea de pagos.
> Regla estricta: **PASS solo si se ejecutó realmente en Supabase**. Si no se ejecutó → **NOT RUN**. Nunca inferir PASS por lectura de código.

## Estado global: 🔴 NO-GO (verificación pendiente en Supabase)

Los tests contra PGlite (Postgres WASM local) dieron **21/21 PASS** para lógica de RPCs/triggers/constraints, pero **PGlite no ejerce RLS ni Storage como usuario final**. Por eso, todo lo relativo a RLS y Storage está **NOT RUN** hasta ejecutarse contra el proyecto Supabase real con `VERIFY_RLS_STORAGE.sql`.

---

## Cómo cerrar el gate
1. **Backup / punto de retorno:** en Supabase, crea un backup (Database → Backups) o trabaja en un proyecto de STAGING. Confirma el `project-ref` correcto.
2. **Crear usuarios de prueba** en Authentication → Users con estos UUID (o ajusta los del script):
   - alice `11111111-1111-1111-1111-111111111111`
   - bob   `22222222-2222-2222-2222-222222222222`
   - pro1  `33333333-3333-3333-3333-333333333333`
   - pro2  `55555555-5555-5555-5555-555555555555`
3. **Aplicar migraciones 0001→0009** en orden (ver `APLICAR_MIGRACIONES.md`). No continuar si una falla.
4. **Ejecutar `VERIFY_RLS_STORAGE.sql`** (idealmente vía `psql`, que respeta `SET ROLE`).
5. **Rellenar la tabla** con PASS/FAIL/NOT RUN según la salida observada.
6. **Smoke test end-to-end** en la app (sección más abajo).
7. Si todo PASS → GO. Si algún crítico FALLA → detener y corregir.

---

## Matriz de verificación (rellenar tras ejecutar)

| # | Verificación | Esperado | Estado | Observado |
|---|---|---|---|---|
| 1 | Cliente lee SUS bookings | filas ≥1 | ⬜ NOT RUN | |
| 2 | Cliente NO lee bookings ajenos | 0 filas | ⬜ NOT RUN | |
| 3 | Cliente NO modifica bookings directo | 0 filas afectadas | ⬜ NOT RUN | |
| 4 | Cliente NO inserta bookings (salta RPC) | DENEGADO | ⬜ NOT RUN | |
| 5 | Cliente NO manipula precio (campos) | imposible (RPC sin param precio) | ⬜ NOT RUN | |
| 6 | RPC calcula precio desde servidor | total=base=precio_pro | ⬜ NOT RUN | |
| 7 | A y B NO ocupan el mismo slot | SLOT_TAKEN | ⬜ NOT RUN | |
| 8 | Slot cancelado vuelve a estar libre | reserva OK tras cancelar | ⬜ NOT RUN | |
| 9 | Profesional ve SUS bookings | filas ≥1 | ⬜ NOT RUN | |
| 10 | Profesional NO ve bookings de otro pro | 0 filas | ⬜ NOT RUN | |
| 11 | Profesional solo transiciones permitidas | confirmar OK / inválida DENIED | ⬜ NOT RUN | |
| 12 | Profesional NO se auto-verifica | verified=false | ⬜ NOT RUN | |
| 13 | Profesional/Cliente NO se hace admin | role=user | ⬜ NOT RUN | |
| 14 | Cliente NO reseña sin booking | FORBIDDEN/NOT_FOUND | ⬜ NOT RUN | |
| 15 | Cliente NO reseña booking no completado | BOOKING_NOT_COMPLETED | ⬜ NOT RUN | |
| 16 | Cliente NO reseña booking ajeno | FORBIDDEN | ⬜ NOT RUN | |
| 17 | Cliente NO crea dos reseñas | ALREADY_REVIEWED | ⬜ NOT RUN | |
| 18 | Rating/reviews_count recalculados | rating=4.00, count=1 | ⬜ NOT RUN | |
| 19 | Storage INE privado NO accesible público | 403 / denegado | ⬜ NOT RUN | |
| 20 | Usuario autorizado obtiene URL firmada | URL válida | ⬜ NOT RUN | |
| 21 | Usuario NO autorizado NO accede a doc privado | denegado | ⬜ NOT RUN | |
| 22 | Audit log registra operaciones sensibles | filas presentes | ⬜ NOT RUN | |
| 23 | Roles/suspended protegidos contra escalada | sin cambio | ⬜ NOT RUN | |
| 24 | Errores no exponen SQL interno | solo códigos de negocio | ⬜ NOT RUN | |

---

## Storage (19-21) — prueba manual en Supabase
1. Como pro1 (autenticado en la app), sube un archivo a `verification/33333333-.../ine.jpg`.
2. Copia la URL pública del bucket privado → intenta abrirla sin sesión → **debe dar 403/denegado** (#19).
3. Genera URL firmada con `supabase.storage.from('verification').createSignedUrl(path, 60)` como pro1 → debe abrir (#20).
4. Como bob, intenta `createSignedUrl` o `download` del path de pro1 → **debe fallar** (#21).

---

## Smoke test end-to-end (app real)
| Paso | Esperado | Estado |
|---|---|---|
| Cliente busca → ve profesional activo | lista con el pro | ⬜ NOT RUN |
| Cliente ve disponibilidad real | slots dentro de horario | ⬜ NOT RUN |
| Cliente reserva | pending + confirmación | ⬜ NOT RUN |
| Pro confirma → in_progress → completed | estados avanzan | ⬜ NOT RUN |
| Cliente reseña completado | reseña guardada | ⬜ NOT RUN |
| Rating del pro se actualiza | promedio real | ⬜ NOT RUN |
| Cliente A reserva slot; B intenta mismo | B recibe SLOT_TAKEN | ⬜ NOT RUN |
| Reserva → cancelación → slot libre | reservable de nuevo | ⬜ NOT RUN |
| Cliente A no ve datos de cliente B | aislamiento | ⬜ NOT RUN |
| Pro1 no ve reservas de Pro2 | aislamiento | ⬜ NOT RUN |

---

## Criterios de GO (todos deben ser PASS)
- [ ] RLS: PASS
- [ ] Storage: PASS
- [ ] RPCs: PASS
- [ ] Concurrencia/doble booking: PASS
- [ ] Máquina de estados: PASS
- [ ] Reseñas: PASS
- [ ] Rating: PASS
- [ ] Roles/escalada: PASS
- [ ] Audit log: PASS
- [ ] Smoke test E2E: PASS

**Mientras exista un solo NOT RUN o FAIL en un ítem crítico → NO-GO. No se inicia Fase 2 (pagos).**

---

## Nota sobre quién ejecuta qué
- **Yo (agente):** creé el script y este documento; validé la lógica en PGlite (21/21). **No tengo acceso a tu Supabase**, así que no puedo (ni debo) ejecutar los pasos 2-4 ni marcar PASS por mi cuenta.
- **Tú:** aplicas migraciones y corres `VERIFY_RLS_STORAGE.sql` + smoke test, y me pasas la salida. Con esos resultados actualizo la matriz y damos GO/NO-GO conjunto.
- Alternativa: si me proporcionas acceso a un proyecto de **staging** (no producción), puedo ejecutar la verificación yo. Es una decisión tuya de seguridad.
