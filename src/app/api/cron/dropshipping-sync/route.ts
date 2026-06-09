import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { syncSupplierPricesAndStock } from "@/lib/dropshipping/sync";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdmin();
  const { data: suppliers } = await supabase
    .from("suppliers").select("id").eq("is_active", true);
  const results: { supplierId: string; processed: number; updated: number; failed: number }[] = [];
  for (const s of suppliers ?? []) {
    try {
      const r = await syncSupplierPricesAndStock(s.id);
      results.push({ supplierId: s.id, ...r });
    } catch (err) {
      console.error("Sync failed for", s.id, err);
    }
  }
  return NextResponse.json({ results });
}
