"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export interface ProductCardProduct {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  base_price: number;
  compare_at_price?: number | null;
  currency: string;
  image: string | null;
  rating_avg: number;
  rating_count: number;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  is_on_sale?: boolean;
}

export function ProductCard({ product, priority }: { product: ProductCardProduct; priority?: boolean }) {
  const wishlistHas = useWishlistStore((s) => s.has(product.id));
  const wishlistToggle = useWishlistStore((s) => s.toggle);
  const cartUpsert = useCartStore((s) => s.upsertLocal);
  const cartOpen = useCartStore((s) => s.open);
  const currency = useUIStore((s) => s.currency);

  const onSale =
    product.compare_at_price && product.compare_at_price > product.base_price;
  const discount = onSale
    ? Math.round(((product.compare_at_price! - product.base_price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/10" />
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {onSale && <Badge variant="destructive">-{discount}%</Badge>}
          {product.is_new_arrival && <Badge variant="default">New</Badge>}
          {product.is_best_seller && <Badge variant="warning">Best seller</Badge>}
        </div>
      </Link>

      <button
        type="button"
        onClick={() =>
          wishlistToggle({
            product_id: product.id,
            slug: product.slug,
            title: product.title,
            image: product.image,
            price: product.base_price,
          })
        }
        aria-label="Toggle wishlist"
        className="absolute right-3 top-3 rounded-full bg-background/90 p-2 shadow transition-transform hover:scale-110"
      >
        <Heart className={cn("h-4 w-4", wishlistHas && "fill-destructive text-destructive")} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/products/${product.slug}`} className="flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.title}</h3>
          {product.rating_count > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{product.rating_avg.toFixed(1)}</span>
              <span>({product.rating_count})</span>
            </div>
          )}
        </Link>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-base font-semibold">
              {formatPrice(product.base_price, currency)}
            </div>
            {onSale && (
              <div className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compare_at_price!, currency)}
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="outline"
            aria-label="Add to cart"
            onClick={() => {
              cartUpsert({
                id: uuid(),
                product_id: product.id,
                variant_id: null,
                quantity: 1,
                unit_price: product.base_price,
                title: product.title,
                image: product.image,
                slug: product.slug,
              });
              cartOpen();
              toast.success("Added to cart");
            }}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
