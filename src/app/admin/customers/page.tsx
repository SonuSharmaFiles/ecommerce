import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { DataTable } from "@/components/admin/data-table";

export const dynamic = "force-dynamic";

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = createSupabaseAdmin();
  let query = supabase.from("profiles")
    .select("id, email, full_name, phone, role, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data, count } = await query;

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-3xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground">{(count ?? 0).toLocaleString()} total</p>
      </header>

      <form className="flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Search by email or name" className="flex h-9 w-72 rounded-md border bg-background px-3 text-sm" />
      </form>

      <DataTable
        columns={[
          { header: "Name", accessor: (r) => <Link href={`/admin/customers/${r.id}`} className="font-medium hover:underline">{r.full_name ?? "—"}</Link> },
          { header: "Email", accessor: (r) => r.email },
          { header: "Role", accessor: (r) => r.role },
          { header: "Status", accessor: (r) => r.status },
          { header: "Joined", accessor: (r) => new Date(r.created_at).toLocaleDateString() },
        ]}
        rows={data ?? []}
      />
    </div>
  );
}
