# Manita — Edge Functions de pagos (ESQUELETO, no activo)

> Estas funciones están LISTAS COMO PLANTILLA pero NO desplegadas. Actívalas cuando decidas
> el modelo económico (comisión) y abras la cuenta de Mercado Pago Marketplace.
> Nada aquí cobra dinero todavía.

## Qué hace cada función
- `crear-pago/`     : crea una preferencia de pago con SPLIT (comisión Manita + resto al pro).
- `webhook-pago/`   : recibe notificaciones de Mercado Pago (pagado/rechazado/reembolsado) y
                      actualiza `bookings.payment_status` y la tabla `payments`.
- `reembolsar/`     : reembolsa un pago (cuando una reserva se cancela antes de completarse).

## Modelo (recordatorio del PLAN_PAGOS_Y_LEGAL.md)
1. Cliente reserva → se crea preferencia → paga → Mercado Pago AUTORIZA.
2. El profesional realiza el servicio → lo marca completado.
3. Cliente confirma (o auto-confirmación por tiempo) → se CAPTURA → split automático.
4. Si falla antes → reembolso.

## Secretos necesarios (Supabase → Project Settings → Edge Functions → Secrets)
- `MP_ACCESS_TOKEN`      : token de la cuenta Marketplace de Mercado Pago.
- `MP_WEBHOOK_SECRET`    : secreto para validar la firma del webhook.
- `MANITA_FEE_RATE`      : comisión de Manita (ej. "0.15" = 15%). ← TU DECISIÓN pendiente.
- `SUPABASE_SERVICE_ROLE_KEY` : para escribir en la BD desde la función (ya lo provee Supabase).

## Desplegar (cuando esté todo listo)
```
supabase functions deploy crear-pago
supabase functions deploy webhook-pago
supabase functions deploy reembolsar
```

## PENDIENTE TUYO antes de activar
- [ ] Definir la comisión (MANITA_FEE_RATE).
- [ ] Abrir cuenta Mercado Pago Marketplace y obtener credenciales.
- [ ] Revisión legal (Ley Fintech, T&C intermediario, CFDI).
- [ ] Conectar el botón "Reservar" al checkout (en perfil.js).
