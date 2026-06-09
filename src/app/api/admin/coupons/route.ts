import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { couponCreateSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await requireAdmin();
  const body = await request.json();
  const parsed = couponCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("coupons").insert({
    code: parsed.data.code.toUpperCase(),
    type: parsed.data.type,
    value: parsed.data.value,
    description: parsed.data.description ?? null,
    min_order_amount: parsed.data.min_order_amount ?? null,
    max_discount: parsed.data.max_discount ?? null,
    usage_limit_total: parsed.data.usage_limit_total ?? null,
    starts_at: parsed.data.starts_at ?? null,
    expires_at: parsed.data.expires_at ?? null,
    is_active: true,
    created_by: user.id,
  }).select("id, code").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({ actorId: user.id, action: "create", resource: "coupon", resourceId: data!.id, after: data });
  return NextResponse.json(data);
}
