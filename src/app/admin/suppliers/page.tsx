import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Suppliers</h1>
        <Button asChild><Link href="/admin/suppliers/new"><Plus className="h-4 w-4" /> Add supplier</Link></Button>
      </header>

      <DataTable
        columns={[
          { header: "Name", accessor: (r) => <Link href={`/admin/suppliers/${r.id}`} className="font-medium hover:underline">{r.name}</Link> },
          { header: "Provider", accessor: (r) => r.provider },
          { header: "Orders", accessor: (r) => r.total_orders },
          { header: "Rating", accessor: (r) => Number(r.rating).toFixed(1) },
          { header: "On-time", accessor: (r) => `${Number(r.on_time_rate).toFixed(0)}%` },
          { header: "Status", accessor: (r) => <Badge variant={r.is_active ? "success" : "secondary"}>{r.is_active ? "Active" : "Off"}</Badge> },
        ]}
        rows={data ?? []}
      />
    </div>
  );
}
