import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get("orderNumber");
  const email = url.searchParams.get("email");
  if (!orderNumber || !email) {
    return NextResponse.json({ error: "Order number and email required" }, { status: 400 });
  }
  const supabase = createSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, status, tracking_number, tracking_url, carrier, shipped_at, delivered_at, email, order_events(status, message, created_at)")
    .eq("order_number", orderNumber).maybeSingle();
  if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const events = (order.order_events ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const { email: _email, order_events: _events, ...safe } = order as Record<string, unknown> & { email: string; order_events: unknown };
  void _email; void _events;
  return NextResponse.json({ ...safe, events });
}
