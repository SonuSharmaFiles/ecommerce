import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { APP_URL } from "@/lib/constants";

export async function POST(request: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
  }
  const { orderId } = await request.json();
  const supabase = createSupabaseAdmin();
  const { data: order } = await supabase.from("orders").select("id, total, currency").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const ppOrder = await createPayPalOrder({
    orderId: order.id,
    amount: Number(order.total),
    currency: order.currency,
    returnUrl: `${APP_URL}/api/payments/paypal/capture?orderId=${order.id}`,
    cancelUrl: `${APP_URL}/checkout?cancelled=1`,
  });

  const approveUrl = (ppOrder.links ?? []).find((l: { rel: string }) => l.rel === "approve")?.href;
  if (!approveUrl) return NextResponse.json({ error: "PayPal approve URL missing" }, { status: 500 });

  await supabase.from("payments").insert({
    order_id: order.id,
    provider: "paypal",
    status: "pending",
    amount: Number(order.total),
    currency: order.currency,
    paypal_order_id: ppOrder.id,
    raw_response: ppOrder as never,
  });

  return NextResponse.json({ approveUrl, paypalOrderId: ppOrder.id });
}
