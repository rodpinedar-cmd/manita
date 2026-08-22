// ============================================
// MANITA — Edge Function: reembolsar (ESQUELETO, no activo)
// Reembolsa un pago cuando una reserva se cancela antes de completarse.
// Solo admin o el proceso interno; nunca el cliente directamente.
// ============================================

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: "booking_id requerido" }, 400);

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: pago } = await supa
      .from("payments")
      .select("provider_payment_id, status")
      .eq("booking_id", booking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pago) return json({ error: "No hay pago para esta reserva" }, 404);

    // TODO: llamar a la API de reembolso de Mercado Pago:
    // await fetch(`https://api.mercadopago.com/v1/payments/${pago.provider_payment_id}/refunds`, {
    //   method: "POST", headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    // });

    await supa.from("bookings").update({ payment_status: "refunded" }).eq("id", booking_id);
    return json({ ok: true, pendiente: "Falta MP_ACCESS_TOKEN para ejecutar el reembolso real." });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}
