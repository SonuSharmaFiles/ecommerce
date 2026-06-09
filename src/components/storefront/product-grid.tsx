import { ProductCard, type ProductCardProduct } from "./product-card";

export function ProductGrid({
  products,
  cols = 4,
}: {
  products: ProductCardProduct[];
  cols?: 2 | 3 | 4;
}) {
  const gridCols = cols === 2
    ? "grid-cols-2 md:grid-cols-2"
    : cols === 3
    ? "grid-cols-2 md:grid-cols-3"
    : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 p-12 text-center text-sm text-muted-foreground">
        No products found.
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
