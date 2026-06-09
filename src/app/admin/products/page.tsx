import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageStr } = await searchParams;
  const supabase = createSupabaseAdmin();
  const page = Math.max(1, Number(pageStr ?? 1));
  const perPage = 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("products")
    .select("id, slug, title, sku, status, base_price, currency, sales_count, view_count, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false }).range(from, to);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / perPage));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{(count ?? 0).toLocaleString()} total</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/admin/products/import">Import from supplier</Link></Button>
          <Button asChild><Link href="/admin/products/new"><Plus className="h-4 w-4" /> New product</Link></Button>
        </div>
      </header>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search products…"
          className="flex h-9 w-72 rounded-md border bg-background px-3 text-sm"
        />
        <Button variant="outline" type="submit">Search</Button>
      </form>

      <DataTable
        columns={[
          { header: "Title", accessor: (r) => (<Link className="font-medium hover:underline" href={`/admin/products/${r.id}`}>{r.title}</Link>) },
          { header: "SKU", accessor: (r) => r.sku ?? "—" },
          { header: "Status", accessor: (r) => <Badge variant={r.status === "active" ? "success" : "secondary"}>{r.status}</Badge> },
          { header: "Price", accessor: (r) => `${r.currency} ${Number(r.base_price).toFixed(2)}`, className: "text-right" },
          { header: "Sales", accessor: (r) => r.sales_count, className: "text-right" },
          { header: "Updated", accessor: (r) => new Date(r.updated_at).toLocaleDateString() },
        ]}
        rows={data ?? []}
      />

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2">
          {page > 1 && <Button asChild variant="outline" size="sm"><Link href={`?page=${page - 1}${q ? `&q=${q}` : ""}`}>Previous</Link></Button>}
          <span className="text-sm">Page {page} of {totalPages}</span>
          {page < totalPages && <Button asChild variant="outline" size="sm"><Link href={`?page=${page + 1}${q ? `&q=${q}` : ""}`}>Next</Link></Button>}
        </nav>
      )}
    </div>
  );
}
