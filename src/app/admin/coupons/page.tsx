import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }).limit(200);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Coupons</h1>
        <Button asChild><Link href="/admin/coupons/new"><Plus className="h-4 w-4" /> New coupon</Link></Button>
      </header>

      <DataTable
        columns={[
          { header: "Code", accessor: (r) => <span className="font-mono font-semibold">{r.code}</span> },
          { header: "Type", accessor: (r) => r.type },
          { header: "Value", accessor: (r) => r.type === "percentage" ? `${r.value}%` : `$${Number(r.value).toFixed(2)}` },
          { header: "Uses", accessor: (r) => `${r.used_count}${r.usage_limit_total ? `/${r.usage_limit_total}` : ""}` },
          { header: "Status", accessor: (r) => <Badge variant={r.is_active ? "success" : "secondary"}>{r.is_active ? "Active" : "Off"}</Badge> },
          { header: "Expires", accessor: (r) => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—" },
        ]}
        rows={data ?? []}
      />
    </div>
  );
}
