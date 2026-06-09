import { NextResponse } from "next/server";
import { importProductFromSupplier } from "@/lib/dropshipping/sync";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/rbac";

export async function POST(request: Request) {
  await requireAdmin();
  const { provider, externalId, markupPercent } = await request.json();
  if (!provider || !externalId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: supplier } = await supabase
    .from("suppliers").select("id").eq("provider", provider).maybeSingle();
  if (!supplier) {
    const { data: created } = await supabase
      .from("suppliers")
      .insert({ provider, name: `${provider} (auto)`, is_active: true })
      .select("id").single();
    if (!created) return NextResponse.json({ error: "Supplier not found" }, { status: 500 });
    const id = await importProductFromSupplier({ supplierId: created.id, externalProductId: externalId, markupPercent });
    return NextResponse.json({ id });
  }
  const id = await importProductFromSupplier({ supplierId: supplier.id, externalProductId: externalId, markupPercent });
  return NextResponse.json({ id });
}
