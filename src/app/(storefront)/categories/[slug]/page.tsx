import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { searchProducts } from "@/lib/products";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 120;

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const { data: cat } = await supabase.from("categories").select("name, seo_title, seo_description").eq("slug", slug).maybeSingle();
  if (!cat) return buildMetadata({ title: "Category", noindex: true });
  return buildMetadata({
    title: cat.seo_title ?? cat.name,
    description: cat.seo_description ?? `Shop ${cat.name} at ShopFlow.`,
    path: `/categories/${slug}`,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const { data: cat } = await supabase.from("categories").select("id, name, description").eq("slug", slug).maybeSingle();
  if (!cat) notFound();

  const { products, total } = await searchProducts({ category: [slug] });

  return (
    <div className="container py-8">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Categories", href: "/categories" },
        { label: cat.name, href: `/categories/${slug}` },
      ]} />
      <h1 className="mt-4 font-display text-3xl font-bold">{cat.name}</h1>
      {cat.description && <p className="mt-2 text-muted-foreground">{cat.description}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{total} products</p>
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
