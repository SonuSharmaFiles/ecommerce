"use client";

import { useWishlistStore } from "@/stores/wishlist-store";
import { useUIStore } from "@/stores/ui-store";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/currency";

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const currency = useUIStore((s) => s.currency);

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your wishlist is empty</h1>
        <Button asChild className="mt-4"><Link href="/products">Browse products</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">My wishlist</h1>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.product_id} className="flex gap-4 rounded-xl border p-4">
            <Link href={`/products/${item.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.image && <Image src={item.image} alt={item.title} fill sizes="96px" className="object-cover" />}
            </Link>
            <div className="flex flex-1 flex-col">
              <Link href={`/products/${item.slug}`} className="font-medium hover:underline">{item.title}</Link>
              <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.price, currency)}</p>
              <div className="mt-auto flex gap-2">
                <Button size="sm" asChild><Link href={`/products/${item.slug}`}>View</Link></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(item.product_id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
