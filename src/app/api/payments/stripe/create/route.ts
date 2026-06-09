import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createPaymentIntent, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const { orderId } = await request.json();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders").select("id, total, currency, email").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const intent = await createPaymentIntent({
    orderId: order.id,
    amount: Number(order.total),
    currency: order.currency,
    customerEmail: order.email,
  });

  return NextResponse.json({ clientSecret: intent.client_secret, intentId: intent.id });
}
