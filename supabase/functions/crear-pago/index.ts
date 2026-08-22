// ============================================
// MANITA — Edge Function: crear-pago (ESQUELETO, no activo)
// Crea una preferencia de pago en Mercado Pago con SPLIT (comisión Manita + resto al pro).
// El MONTO y la COMISIÓN se calculan SIEMPRE en el servidor (nunca se confía en el cliente).
// Deno runtime (Supabase Edge Functions).
// ============================================

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const MANITA_FEE_RATE = Number(Deno.env.get("MANITA_FEE_RATE") ?? "0.15"); // TU DECISIÓN
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: "booking_id requerido" }, 400);

    // Cliente con service_role para leer el monto REAL de la reserva (no del cliente)
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: b, error } = await supa
      .from("bookings")
      .select("id, total, currency, professional_id, payment_status")
      .eq("id", booking_id)
      .single();
    if (error || !b) return json({ error: "Reserva no encontrada" }, 404);
    if (b.payment_status !== "unpaid") return json({ error: "La reserva ya tiene pago" }, 409);

    // Comisión de Manita calculada aquí (server-side). El resto va al profesional.
    const total = Number(b.total);
    const comisionManita = Math.round(total * MANITA_FEE_RATE * 100) / 100;

    // TODO: obtener el collector_id / cuenta MP del profesional (columna a agregar en professionals).
    // const proMpAccount = ...;

    // TODO: crear preferencia en Mercado Pago con marketplace_fee = comisionManita.
    // const pref = await fetch("https://api.mercadopago.com/checkout/preferences", {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     items: [{ title: "Servicio Manita", quantity: 1, unit_price: total, currency_id: b.currency }],
    //     marketplace_fee: comisionManita,
    //     external_reference: b.id,
    //     notification_url: `${SUPABASE_URL}/functions/v1/webhook-pago`,
    //     back_urls: { success: "https://manita-cdmx.netlify.app/reserva-confirmada.html?id=" + b.id },
    //     auto_return: "approved"
    //   })
    // }).then(r => r.json());

    // Placeholder mientras no hay credenciales:
    return json({
      pendiente: true,
      mensaje: "Edge Function lista. Falta MP_ACCESS_TOKEN y la cuenta del profesional para activar.",
      calculo: { total, comisionManita, alProfesional: total - comisionManita }
      // , init_point: pref.init_point  // ← URL de checkout cuando esté activo
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}
