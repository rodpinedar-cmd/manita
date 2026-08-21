# Manita — Plan de pagos y checklist legal (México)

> ⚠️ Esto es orientación técnica/general, NO asesoría legal. Antes de cobrar dinero
> real, valídalo con un abogado fintech mexicano. No soy abogado.

## 1. Estado actual
Manita NO cobra dinero todavía. El backend ya tiene la estructura lista (tablas
`payments`, `refunds`, `payouts`, campos `platform_fee`, `payment_status`, comisión
15% calculada server-side), pero NO hay pasarela conectada. La "Garantía Manita"
es hoy una promesa de UI, no un cobro real.

## 2. Flujo de pago (modelo correcto para marketplace)

1. Cliente reserva y paga → la pasarela **AUTORIZA** el cargo (aparta el dinero, no lo cobra).
2. El dinero queda **retenido** (ni del cliente ni del pro).
3. El profesional realiza el servicio y lo marca **completado**.
4. El cliente **confirma** (o pasa un plazo automático de auto-confirmación).
5. Se **CAPTURA** el pago: Manita descuenta su comisión y **libera el resto al profesional**.
6. Si algo falla antes del paso 5 → **reembolso** al cliente (nunca se cobró del todo).

```
Cliente (app) → Edge Function → Pasarela (Mercado Pago / Stripe)
                     ↑                    │
                 webhook ←────────────────┘  (pagado / rechazado / reembolsado)
                     ↓
                Supabase (payments, bookings.payment_status)
```

## 3. Seguridad
- Los datos de tarjeta los maneja la PASARELA (certificada PCI-DSS). La app nunca los ve ni guarda.
- Capturar / reembolsar / calcular comisión → SOLO en el servidor (Edge Functions de Supabase),
  con la clave secreta que el cliente nunca ve. Nunca confiar en el cliente para montos.
- El precio/comisión ya se calculan server-side (RPC `crear_reserva`, `platform_fee_rate`).

## 4. LO LEGAL MÁS IMPORTANTE: no retengas dinero de terceros tú mismo

Si Manita junta el dinero de los clientes en su cuenta y luego lo reparte a los
trabajadores, estaría actuando como intermediario/agregador de fondos. En México eso
puede caer bajo la **Ley Fintech** (regulada por CNBV/Banxico) y requerir autorización.

**Solución:** usar el **split de pagos / marketplace** de la propia pasarela, para que
el dinero NUNCA se detenga en la cuenta de Manita:
- **Mercado Pago — Marketplace / split**: divide el pago automáticamente (comisión a Manita,
  resto directo a la cuenta del profesional). La retención y el reparto los hace Mercado Pago.
- **Stripe Connect**: equivalente (destination charges / separate charges & transfers).

Con split payment, Manita es solo "la plataforma que conecta y cobra comisión",
no "el que guarda el dinero ajeno". Esto evita el problema regulatorio grave.

## 5. Checklist legal (independiente de la pasarela)
- [ ] **Términos y Condiciones**: Manita es INTERMEDIARIO/plataforma, no el prestador ni empleador.
- [ ] **Aviso de Privacidad** conforme LFPDPPP (reforzar `legal.html`).
- [ ] **Facturación CFDI/SAT**: con split, cada quien factura su parte (Manita su comisión, el pro su servicio).
- [ ] **Prestador independiente**: dejar por escrito que el pro NO es empleado (evita IMSS/obligaciones laborales).
- [ ] **Política de reembolsos y cancelaciones** publicada (transparencia PROFECO).
- [ ] **Manejo de disputas**: proceso claro cliente vs. pro.
- [ ] Revisión final con **abogado fintech mexicano** antes de cobrar dinero real.

## 6. Recomendación de secuencia
1. Primero: tracción real (usuarios usando la app gratis).
2. Definir las 10 decisiones del modelo económico (ver MODELO_ECONOMICO_PROPUESTA.md):
   % comisión, quién paga la comisión de la pasarela, plazos de liberación, reembolsos, etc.
3. Abrir cuenta Mercado Pago (marketplace) y obtener credenciales.
4. Edge Functions: crear pago (split), capturar al completar, reembolsar, webhook.
5. Conectar el botón de reservar al checkout.
6. T&C + aviso de privacidad + política de reembolsos publicados ANTES de cobrar.

## 7. Costo
- Abrir cuenta: gratis. Sin mensualidad.
- Comisión por transacción de la pasarela (~3-4% + IVA), se descuenta solo cuando cobras.
- No gastas nada hasta que hay ventas reales.
