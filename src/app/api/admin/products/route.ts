import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { productCreateSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  const user = await requireAdmin();
  const body = await request.json();
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const slug = parsed.data.slug || slugify(parsed.data.title);
  const { data, error } = await supabase.from("products").insert({
    slug,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    base_price: parsed.data.base_price,
    compare_at_price: parsed.data.compare_at_price ?? null,
    status: parsed.data.status,
    brand_id: parsed.data.brand_id ?? null,
  }).select("id, slug").single();
  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });

  if (parsed.data.category_ids?.length) {
    await supabase.from("product_categories").insert(
      parsed.data.category_ids.map((category_id) => ({ product_id: data.id, category_id }))
    );
  }

  await audit({
    actorId: user.id,
    action: "create",
    resource: "product",
    resourceId: data.id,
    after: data,
  });

  return NextResponse.json(data);
}
