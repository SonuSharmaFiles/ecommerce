import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { capturePayPalOrder } from "@/lib/paypal";
import { markOrderPaid } from "@/lib/orders";
import { APP_URL } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const ppToken = url.searchParams.get("token");
  if (!orderId || !ppToken) {
    return NextResponse.redirect(`${APP_URL}/checkout?error=missing_params`);
  }

  try {
    const capture = await capturePayPalOrder(ppToken);
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const supabase = createSupabaseAdmin();
    const { data: order } = await supabase.from("orders").select("total, currency").eq("id", orderId).single();
    if (!order) throw new Error("Order not found");
    await markOrderPaid(orderId, {
      provider: "paypal",
      status: "paid",
      amount: Number(order.total),
      currency: order.currency,
      paypal_order_id: ppToken,
      charge_id: captureId,
      raw: capture,
    });
    return NextResponse.redirect(`${APP_URL}/orders/thank-you?orderId=${orderId}`);
  } catch (err) {
    console.error("PayPal capture failed", err);
    return NextResponse.redirect(`${APP_URL}/checkout?error=paypal_capture`);
  }
}
