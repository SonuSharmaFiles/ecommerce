import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { markOrderPaid } from "@/lib/orders";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  // Idempotency
  const { data: existing } = await supabase.from("webhook_events").select("id").eq("id", event.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, deduped: true });
  await supabase.from("webhook_events").insert({
    id: event.id, provider: "stripe", event_type: event.type, raw: event as never,
  });

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await markOrderPaid(orderId, {
          provider: "stripe",
          status: "paid",
          amount: intent.amount / 100,
          currency: intent.currency.toUpperCase(),
          intent_id: intent.id,
          charge_id: intent.latest_charge as string | undefined,
          raw: intent,
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await supabase.from("orders").update({ payment_status: "failed", status: "failed" }).eq("id", orderId);
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string | null;
      if (paymentIntentId) {
        const { data: pay } = await supabase.from("payments").select("order_id, id").eq("intent_id", paymentIntentId).maybeSingle();
        if (pay) {
          await supabase.from("payments").update({
            status: "refunded",
            refunded_amount: (charge.amount_refunded ?? 0) / 100,
          }).eq("id", pay.id);
          await supabase.from("orders").update({
            status: "refunded",
            payment_status: "refunded",
            refunded_at: new Date().toISOString(),
          }).eq("id", pay.order_id);
        }
      }
      break;
    }
    default:
      break;
  }

  await supabase.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
  return NextResponse.json({ ok: true });
}
