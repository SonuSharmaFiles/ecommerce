import { searchProducts, getCategoryTree, getBrands } from "@/lib/products";
import { ProductGrid } from "@/components/storefront/product-grid";
import { FilterPanel } from "@/components/storefront/filter-panel";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/storefront/json-ld";
import { breadcrumbSchema } from "@/lib/schema-org";
import { clampPage } from "@/lib/utils";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { Suspense } from "react";

export const revalidate = 60;

export const metadata = buildMetadata({
  title: "All products",
  description: "Browse our full catalog.",
  path: "/products",
});

interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  min?: string;
  max?: string;
  rating?: string;
  sort?: string;
  page?: string;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = {
    q: sp.q,
    category: sp.category?.split(",").filter(Boolean),
    brand: sp.brand?.split(",").filter(Boolean),
    min: sp.min ? Number(sp.min) : undefined,
    max: sp.max ? Number(sp.max) : undefined,
    rating: sp.rating ? Number(sp.rating) : undefined,
    sort: (sp.sort ?? "relevance") as never,
    page: Number(sp.page ?? 1),
    perPage: PRODUCTS_PER_PAGE,
  };

  const [{ products, total, page, totalPages }, categories, brands] = await Promise.all([
    searchProducts(filters),
    getCategoryTree(),
    getBrands(),
  ]);

  const safePage = clampPage(page, totalPages);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
  ];

  return (
    <>
      <div className="container py-6">
        <Breadcrumbs items={crumbs} />
        <div className="mt-4 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-bold">All products</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} items</p>
        </div>
      </div>

      <div className="container grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[260px_1fr]">
        <Suspense fallback={<div />}>
          <FilterPanel
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
            priceRange={[0, 500]}
          />
        </Suspense>

        <section>
          <div className="mb-4 flex items-center justify-end">
            <SortSelect />
          </div>
          <ProductGrid products={products} />
          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2">
              {safePage > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildHref(sp, safePage - 1)}>Previous</Link>
                </Button>
              )}
              <span className="text-sm">Page {safePage} of {totalPages}</span>
              {safePage < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildHref(sp, safePage + 1)}>Next</Link>
                </Button>
              )}
            </nav>
          )}
        </section>
      </div>

      <JsonLd id="breadcrumbs" data={breadcrumbSchema(crumbs)} />
    </>
  );
}

function buildHref(sp: SearchParams, page: number) {
  const params = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => v && k !== "page" && params.set(k, v as string));
  params.set("page", String(page));
  return `?${params.toString()}`;
}

function SortSelect() {
  return (
    <form>
      <Select name="sort" defaultValue="relevance">
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="relevance">Most relevant</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="best_sellers">Best sellers</SelectItem>
          <SelectItem value="rating">Top rated</SelectItem>
          <SelectItem value="price_asc">Price: low to high</SelectItem>
          <SelectItem value="price_desc">Price: high to low</SelectItem>
        </SelectContent>
      </Select>
    </form>
  );
}
