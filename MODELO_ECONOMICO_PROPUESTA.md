# Propuesta de Modelo Económico — Manita (PARA APROBACIÓN)

> **Nada aquí está aprobado.** El "15%" del código es placeholder. Este documento propone cifras y reglas para tu decisión. No se codifica Mercado Pago hasta que apruebes esto.

## Contexto México (datos que afectan las cifras)
- **IVA:** 16%. Los servicios entre particulares pueden no facturar IVA, pero si Manita cobra una **comisión de servicio**, esa comisión es un ingreso de Manita y normalmente causa IVA. Requiere validación con un contador (implicación legal, ver §Legal).
- **Comisión del procesador (Mercado Pago):** aproximadamente 3.5% + IVA sobre ese fee, variable según plazo de liberación del dinero. Cifra a confirmar con la cuenta MP real.
- **Retención de dinero:** MP no ofrece escrow bancario genérico. Manita **retiene en su cuenta MP** y paga al pro al completar (escrow operado por plataforma).

---

## 1. Estructura de precio (propuesta)

**Modelo A — Comisión al profesional (recomendado, estándar en marketplaces):**
El cliente paga el precio publicado. Manita descuenta su comisión del pago al profesional.

| Concepto | Ejemplo (servicio $350) |
|---|---|
| Precio del servicio (lo publica el pro) | $350.00 |
| **Paga el cliente** | **$350.00** |
| Comisión Manita (take rate, ver §2) | −$? |
| Comisión procesador MP (~3.5%+IVA) | (la absorbe Manita del bruto) |
| **Recibe el profesional (neto)** | **$350 − comisión Manita** |
| **Ingreso bruto de Manita** | comisión Manita − comisión MP |

**Modelo B — Service fee al cliente (alternativa):**
El cliente paga precio + fee visible de Manita. El pro recibe el precio íntegro. Más transparente para el pro, pero encarece al cliente.

**Decisión necesaria:** ¿Modelo A o B? (Recomiendo A para no encarecer al cliente al inicio.)

---

## 2. Take rate de Manita (propuesta a decidir)
Rango típico en marketplaces de servicios: **10%–25%**.
- Propuesta inicial: **12%** al profesional (competitivo para atraer oferta al lanzar).
- Alternativas: 10% (más oferta, menos margen) / 15% / 18% (más margen, menos atractivo).

**Decisión necesaria:** ¿qué % exacto? ¿Igual para todas las categorías o variable?

---

## 3. Impuestos (IVA) — cómo se muestra
- Propuesta: mostrar al cliente **precio final todo incluido** (sin desglose de IVA si no se factura al cliente).
- La comisión de Manita al pro se documenta con su IVA correspondiente en el estado de cuenta del pro.
- **Requiere validación contable/fiscal antes de producción.**

**Decisión necesaria:** ¿Manita emite CFDI a profesionales por su comisión desde el inicio? (afecta arquitectura de facturación).

---

## 4. Máquina de estados financiera (propuesta)

```
payment:  created → authorized → captured → (refund_pending) → refunded / partially_refunded
                              ↘ failed
payout:   pending → processing → paid / failed
```

- **Autorización vs cobro:** Propuesta MVP: **cobro inmediato** al confirmar el pago (MP captura al momento). El dinero queda en la cuenta MP de Manita.
- **Reconocimiento de ingreso de Manita:** cuando el servicio pasa a `completed` y se libera el payout (no antes; hasta entonces es pasivo/dinero de terceros).
- **Liberación de payout al profesional:** propuesta **T+X tras `completed`** (ej. 24-48h para dar ventana de disputa). X a decidir.

**Decisiones necesarias:** ¿cobro inmediato o autorización diferida? ¿ventana de disputa antes del payout (cuántas horas)?

---

## 5. Cancelaciones y no-show (propuesta de política)

| Escenario | Cliente | Profesional | Reembolso | Comisión Manita |
|---|---|---|---|---|
| Cancela cliente **antes de confirmar** | libre | — | 100% | $0 |
| Cancela cliente **tras confirmar, >24h antes** | permitido | — | 100% | $0 |
| Cancela cliente **<24h antes** | penalización | — | parcial (ej. 50%) | retiene fee procesador |
| Cancela profesional (cualquier momento) | — | penalización a futuro | 100% al cliente | $0 |
| No-show cliente | — | pro reporta | sin reembolso | comisión aplica |
| No-show profesional | cliente reporta | penalización | 100% al cliente | $0 |

**Decisiones necesarias:** ¿ventana de cancelación sin penalización (24h?)? ¿% de penalización por cancelación tardía? ¿penalización al pro por cancelar (suspensión temporal, baja de ranking)?

---

## 6. Disputas y reembolsos
- **Disputa:** cliente o pro marca `disputed` tras completed/no-show. Soporte resuelve manualmente (Fase 3).
- **Reembolso total:** vía API MP; `payment_status='refunded'`, payout no se libera.
- **Reembolso parcial:** ej. servicio incompleto; `partially_refunded`. El resto va al pro menos comisión.
- **Comisión en refund:** propuesta: si se reembolsa por culpa del pro o de Manita, **se devuelve también la comisión** (fee procesador puede no ser recuperable → lo absorbe Manita). Si es cancelación tardía del cliente, Manita puede retener el fee del procesador.
- **Chargebacks:** el cliente disputa en su banco. Propuesta: Manita asume el chargeback y lo descuenta del pro solo si el servicio no se prestó; política antifraude asociada.

**Decisiones necesarias:** ¿quién absorbe el fee del procesador en cada tipo de refund? ¿política de chargeback?

---

## 7. Casos especiales
- **Reservas urgentes (Manita AHORA, futuro):** comisión premium (ej. +5%) — a decidir.
- **Descuentos/promociones:** ¿los absorbe Manita o el pro? Propuesta: cupones de adquisición los absorbe Manita; descuentos del pro los pone el pro.

---

## 8. Implicaciones legales (a validar con profesional)
- Facturación CFDI y régimen fiscal de Manita y de los profesionales.
- IVA sobre la comisión.
- Términos y condiciones que expliquen el escrow operado por plataforma (no custodia bancaria).
- Protección al consumidor (PROFECO): política de reembolso clara y visible.
- LFPDPPP: manejo de datos de pago (nunca almacenar datos de tarjeta; los tokeniza MP).

---

## RESUMEN — Decisiones que necesito de ti antes de codificar pagos
1. Modelo A (comisión al pro) o B (fee al cliente).
2. Take rate exacto (%). ¿Uniforme o por categoría?
3. ¿Manita emite CFDI a pros desde el inicio?
4. Cobro inmediato o autorización diferida.
5. Ventana de disputa antes de liberar payout (horas).
6. Ventana de cancelación sin penalización y % de penalización tardía.
7. Penalización al pro por cancelar/no-show.
8. Quién absorbe el fee del procesador en cada tipo de refund.
9. Política de chargeback.
10. Confirmar proveedor: **Mercado Pago** (o evaluar Stripe/Conekta/otro).

Con estas respuestas, actualizo `platform_fee_rate()` y las tablas `payments/refunds/payouts`, y recién entonces empiezo la Fase 2.
