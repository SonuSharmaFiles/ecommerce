import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { markOrderPaid } from "@/lib/orders";

/**
 * PayPal webhook verification ideally calls /v1/notifications/verify-webhook-signature.
 * Implemented here as best-effort: we trust the body's event_type + resource ids,
 * but de-duplicate by event id and skip if we can't find the matching order.
 * For full signature verification, set PAYPAL_WEBHOOK_ID and call the verify endpoint.
 */
export async function POST(request: Request) {
  const event = await request.json();
  const supabase = createSupabaseAdmin();

  const { data: existing } = await supabase.from("webhook_events").select("id").eq("id", event.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, deduped: true });
  await supabase.from("webhook_events").insert({
    id: event.id, provider: "paypal", event_type: event.event_type, raw: event,
  });

  switch (event.event_type) {
    case "CHECKOUT.ORDER.APPROVED":
    case "PAYMENT.CAPTURE.COMPLETED": {
      const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id
        ?? event.resource?.id;
      const { data: pay } = await supabase.from("payments")
        .select("id, order_id, amount, currency").eq("paypal_order_id", paypalOrderId).maybeSingle();
      if (pay) {
        await markOrderPaid(pay.order_id, {
          provider: "paypal",
          status: "paid",
          amount: pay.amount,
          currency: pay.currency,
          paypal_order_id: paypalOrderId,
          charge_id: event.resource?.id,
          raw: event,
        });
      }
      break;
    }
    case "PAYMENT.CAPTURE.REFUNDED": {
      const captureId = event.resource?.id;
      const { data: pay } = await supabase.from("payments").select("id, order_id").eq("charge_id", captureId).maybeSingle();
      if (pay) {
        await supabase.from("payments").update({ status: "refunded" }).eq("id", pay.id);
        await supabase.from("orders").update({
          status: "refunded", payment_status: "refunded", refunded_at: new Date().toISOString(),
        }).eq("id", pay.order_id);
      }
      break;
    }
    default: break;
  }

  await supabase.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
  return NextResponse.json({ ok: true });
}
