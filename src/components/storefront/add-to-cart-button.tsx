"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { v4 as uuid } from "uuid";

interface Props {
  product: { id: string; slug: string; title: string; base_price: number; image: string | null };
  variantId?: string | null;
  variantPrice?: number;
  inStock: boolean;
  variant?: "default" | "outline";
  size?: "default" | "lg";
}

export function AddToCartButton({ product, variantId, variantPrice, inStock, variant = "default", size = "lg" }: Props) {
  const upsert = useCartStore((s) => s.upsertLocal);
  const open = useCartStore((s) => s.open);
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!inStock) return;
    setLoading(true);
    upsert({
      id: uuid(),
      product_id: product.id,
      variant_id: variantId ?? null,
      quantity: 1,
      unit_price: variantPrice ?? product.base_price,
      title: product.title,
      image: product.image,
      slug: product.slug,
    });
    open();
    toast.success("Added to cart");
    setLoading(false);
  }

  return (
    <Button
      type="button" variant={variant} size={size}
      onClick={onClick} disabled={!inStock || loading} className="w-full"
    >
      <ShoppingBag className="h-4 w-4" /> {inStock ? "Add to cart" : "Out of stock"}
    </Button>
  );
}
