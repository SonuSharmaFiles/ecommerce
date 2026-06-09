import { NextResponse } from "next/server";
import { requireAdmin, hasPermission } from "@/lib/rbac";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { refundPaymentIntent } from "@/lib/stripe";
import { refundPayPalCapture } from "@/lib/paypal";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ amount: z.number().positive().optional(), reason: z.string().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!hasPermission(user.role, "order.refund")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: payment } = await supabase
    .from("payments").select("*").eq("order_id", id).eq("status", "paid").maybeSingle();
  if (!payment) return NextResponse.json({ error: "No paid payment found" }, { status: 404 });

  try {
    if (payment.provider === "stripe" && payment.intent_id) {
      await refundPaymentIntent(payment.intent_id, parsed.data.amount);
    } else if (payment.provider === "paypal" && payment.charge_id) {
      await refundPayPalCapture(payment.charge_id, parsed.data.amount, payment.currency);
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const amount = parsed.data.amount ?? Number(payment.amount);
    await supabase.from("refunds").insert({
      order_id: id,
      payment_id: payment.id,
      amount,
      reason: parsed.data.reason,
      created_by: user.id,
    });
    await audit({ actorId: user.id, action: "refund", resource: "order", resourceId: id, after: { amount } });
    return NextResponse.json({ ok: true, amount });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Refund failed" }, { status: 500 });
  }
}
