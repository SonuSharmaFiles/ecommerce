import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from("blog_posts")
    .select("id, slug, title, is_published, view_count, published_at, updated_at")
    .order("updated_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Blog</h1>
        <Button asChild><Link href="/admin/blog/new"><Plus className="h-4 w-4" /> New post</Link></Button>
      </header>

      <DataTable
        columns={[
          { header: "Title", accessor: (r) => <Link href={`/admin/blog/${r.id}`} className="font-medium hover:underline">{r.title}</Link> },
          { header: "Status", accessor: (r) => <Badge variant={r.is_published ? "success" : "secondary"}>{r.is_published ? "Published" : "Draft"}</Badge> },
          { header: "Views", accessor: (r) => r.view_count, className: "text-right" },
          { header: "Published", accessor: (r) => r.published_at ? new Date(r.published_at).toLocaleDateString() : "—" },
        ]}
        rows={data ?? []}
      />
    </div>
  );
}
