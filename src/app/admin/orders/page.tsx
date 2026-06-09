import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { status, page: pageStr } = await searchParams;
  const supabase = createSupabaseAdmin();
  const page = Math.max(1, Number(pageStr ?? 1));
  const perPage = 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("orders")
    .select("id, order_number, status, payment_status, total, currency, email, created_at", { count: "exact" })
    .order("created_at", { ascending: false }).range(from, to);
  if (status) query = query.eq("status", status);

  const { data, count } = await query;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{(count ?? 0).toLocaleString()} total</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {["all", "pending", "processing", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
          <Link
            key={s}
            href={s === "all" ? "?" : `?status=${s}`}
            className={`rounded-md border px-3 py-1 text-xs ${status === s || (!status && s === "all") ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <DataTable
        columns={[
          { header: "Order", accessor: (r) => <Link className="font-medium hover:underline" href={`/admin/orders/${r.id}`}>{r.order_number}</Link> },
          { header: "Customer", accessor: (r) => r.email },
          { header: "Status", accessor: (r) => <Badge variant={r.status === "delivered" ? "success" : r.status === "cancelled" || r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge> },
          { header: "Payment", accessor: (r) => <Badge variant="outline">{r.payment_status}</Badge> },
          { header: "Total", accessor: (r) => `${r.currency} ${Number(r.total).toFixed(2)}`, className: "text-right" },
          { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleString() },
        ]}
        rows={data ?? []}
      />
    </div>
  );
}
