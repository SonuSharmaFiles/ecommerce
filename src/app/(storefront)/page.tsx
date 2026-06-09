import { Hero } from "@/components/storefront/hero";
import { Section } from "@/components/storefront/section";
import { ProductGrid } from "@/components/storefront/product-grid";
import { CategoriesRow } from "@/components/storefront/categories-row";
import { Testimonials } from "@/components/storefront/testimonials";
import { TrustBadges } from "@/components/storefront/trust-badges";
import { NewsletterCTA } from "@/components/storefront/newsletter";
import {
  getFeaturedProducts, getNewArrivals, getBestSellers, getOnSaleProducts, getCategoryTree,
} from "@/lib/products";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Premium products, fast delivery",
  description: "Shop the world's most-loved brands with confidence. Free shipping over $75.",
});

export default async function HomePage() {
  const [featured, newArrivals, bestSellers, flashDeals, categories] = await Promise.all([
    getFeaturedProducts(8),
    getNewArrivals(8),
    getBestSellers(8),
    getOnSaleProducts(8),
    getCategoryTree(),
  ]);

  const topCategories = categories.filter((c) => !c.parent_id).slice(0, 6);

  return (
    <>
      <Hero />

      <div className="container py-10">
        <TrustBadges />
      </div>

      {topCategories.length > 0 && (
        <Section title="Shop by category">
          <CategoriesRow categories={topCategories} />
        </Section>
      )}

      {featured.length > 0 && (
        <Section title="Featured products" subtitle="Hand-picked for you" href="/products?sort=relevance">
          <ProductGrid products={featured} />
        </Section>
      )}

      {flashDeals.length > 0 && (
        <Section title="Flash deals" subtitle="Limited-time discounts" href="/deals">
          <ProductGrid products={flashDeals} />
        </Section>
      )}

      {bestSellers.length > 0 && (
        <Section title="Best sellers" subtitle="Customer favorites" href="/products?sort=best_sellers">
          <ProductGrid products={bestSellers} />
        </Section>
      )}

      {newArrivals.length > 0 && (
        <Section title="New arrivals" subtitle="Fresh from the shelves" href="/products?sort=newest">
          <ProductGrid products={newArrivals} />
        </Section>
      )}

      <Section title="Loved by customers">
        <Testimonials />
      </Section>

      <NewsletterCTA />
    </>
  );
}
