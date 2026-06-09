import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Blog",
  description: "Stories, guides, and shopping inspiration from ShopFlow.",
  path: "/blog",
});

export default async function BlogIndex() {
  const supabase = await createSupabaseServer();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at, reading_minutes")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="container py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">Blog</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(posts ?? []).map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <Link href={`/blog/${p.slug}`} className="block">
              {p.cover_image_url && (
                <div className="relative aspect-video w-full bg-muted">
                  <Image src={p.cover_image_url} alt={p.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
              )}
              <CardContent className="space-y-2 pt-4">
                <h2 className="line-clamp-2 font-semibold">{p.title}</h2>
                {p.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>}
                <div className="text-xs text-muted-foreground">
                  {p.published_at && new Date(p.published_at).toLocaleDateString()}
                  {p.reading_minutes ? ` · ${p.reading_minutes} min read` : ""}
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
        {!posts?.length && (
          <p className="col-span-full text-center text-sm text-muted-foreground">No posts yet.</p>
        )}
      </div>
    </div>
  );
}
