import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { renderOrderConfirmation, renderShippingNotice } from "@/emails/templates";

export async function generateOrderNumber(): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.rpc("generate_order_number" as never);
  if (typeof data === "string") return data;
  const yr = new Date().getFullYear();
  return `SF-${yr}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

export async function recordOrderEvent(orderId: string, status: string, message?: string, source = "system") {
  const supabase = createSupabaseAdmin();
  await supabase.from("order_events").insert({
    order_id: orderId,
    status: status as never,
    message,
    source,
  });
}

export async function markOrderPaid(orderId: string, paymentRow: {
  provider: "stripe" | "paypal";
  status: "paid" | "authorized";
  amount: number;
  currency: string;
  intent_id?: string;
  charge_id?: string;
  paypal_order_id?: string;
  raw: unknown;
}) {
  const supabase = createSupabaseAdmin();
  await supabase.from("payments").insert({
    order_id: orderId,
    provider: paymentRow.provider,
    status: paymentRow.status,
    amount: paymentRow.amount,
    currency: paymentRow.currency,
    intent_id: paymentRow.intent_id,
    charge_id: paymentRow.charge_id,
    paypal_order_id: paymentRow.paypal_order_id,
    raw_response: paymentRow.raw as never,
    processed_at: new Date().toISOString(),
  });
  await supabase.from("orders").update({
    payment_status: paymentRow.status,
    status: paymentRow.status === "paid" ? "processing" : "pending",
  }).eq("id", orderId);
  await recordOrderEvent(orderId, "processing", "Payment captured", "webhook");

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (order?.email) {
    const html = renderOrderConfirmation(order as never);
    await sendEmail({
      to: order.email,
      subject: `Order ${order.order_number} confirmed`,
      html,
      template: "order_confirmation",
      relatedType: "order",
      relatedId: orderId,
    }).catch(() => null);
  }
}

export async function markOrderShipped(orderId: string, args: {
  carrier?: string; trackingNumber?: string; trackingUrl?: string;
}) {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  await supabase.from("orders").update({
    status: "shipped",
    shipped_at: now,
    carrier: args.carrier,
    tracking_number: args.trackingNumber,
    tracking_url: args.trackingUrl,
  }).eq("id", orderId);
  await supabase.from("shipments").insert({
    order_id: orderId,
    carrier: args.carrier,
    tracking_number: args.trackingNumber,
    tracking_url: args.trackingUrl,
    status: "shipped",
    shipped_at: now,
  });
  await recordOrderEvent(orderId, "shipped", "Order shipped", "system");

  const { data: order } = await supabase.from("orders").select("order_number, email").eq("id", orderId).single();
  if (order?.email) {
    await sendEmail({
      to: order.email,
      subject: `Order ${order.order_number} has shipped`,
      html: renderShippingNotice({ orderNumber: order.order_number, carrier: args.carrier, trackingNumber: args.trackingNumber, trackingUrl: args.trackingUrl }),
      template: "shipping_notice",
      relatedType: "order",
      relatedId: orderId,
    }).catch(() => null);
  }
}
