import { ProductGrid } from "@/components/storefront/product-grid";
import { getOnSaleProducts } from "@/lib/products";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 60;
export const metadata = buildMetadata({
  title: "Flash deals & discounts",
  description: "Limited-time discounts on best-selling products.",
  path: "/deals",
});

export default async function DealsPage() {
  const products = await getOnSaleProducts(48);
  return (
    <div className="container py-10">
      <h1 className="mb-2 font-display text-3xl font-bold">Flash deals</h1>
      <p className="mb-8 text-muted-foreground">Hand-picked discounts. Available while supplies last.</p>
      <ProductGrid products={products} />
    </div>
  );
}
