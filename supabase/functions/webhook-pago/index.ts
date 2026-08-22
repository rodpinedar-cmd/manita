// ============================================
// MANITA — Edge Function: webhook-pago (ESQUELETO, no activo)
// Recibe notificaciones de Mercado Pago y actualiza bookings.payment_status + tabla payments.
// NUNCA confía en el cliente: consulta el estado real del pago contra la API de MP.
// ============================================

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapea el estado de Mercado Pago → payment_status de Manita
const MAP: Record<string, string> = {
  approved: "captured",
  authorized: "authorized",
  refunded: "refunded",
  cancelled: "failed",
  rejected: "failed",
};

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // MP manda { type: "payment", data: { id } }
    const paymentId = body?.data?.id;
    if (!paymentId) return new Response("ignored", { status: 200 });

    // TODO: validar la firma del webhook con MP_WEBHOOK_SECRET antes de confiar.

    // Consultar el pago REAL en Mercado Pago (fuente de verdad)
    const pago = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    }).then((r) => r.json());

    const bookingId = pago.external_reference;
    const estado = MAP[pago.status] ?? "unpaid";
    if (!bookingId) return new Response("no ref", { status: 200 });

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    await supa.from("bookings").update({ payment_status: estado }).eq("id", bookingId);
    await supa.from("payments").insert({
      booking_id: bookingId,
      provider: "mercadopago",
      provider_payment_id: String(paymentId),
      status: estado,
      amount: pago.transaction_amount,
    }).select();

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
