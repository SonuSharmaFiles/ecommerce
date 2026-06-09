"use client";

import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const remove = useCartStore((s) => s.removeLocal);
  const updateQty = useCartStore((s) => s.updateQtyLocal);
  const currency = useUIStore((s) => s.currency);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const freeShippingThreshold = 75;
  const shipping = subtotal >= freeShippingThreshold ? 0 : subtotal > 0 ? 7.5 : 0;
  const total = subtotal - discount + shipping;

  async function applyCoupon() {
    if (!coupon) return;
    try {
      const res = await fetch(`/api/coupons/${encodeURIComponent(coupon)}?subtotal=${subtotal}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.message ?? "Invalid coupon");
        return;
      }
      setDiscount(json.discount);
      toast.success("Coupon applied");
    } catch {
      toast.error("Could not apply coupon");
    }
  }

  if (lines.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Discover something new.</p>
        <Button asChild className="mt-6"><Link href="/products">Browse products</Link></Button>
      </div>
    );
  }

  return (
    <div className="container grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-6 font-display text-3xl font-bold">Your cart</h1>
        <ul className="divide-y rounded-xl border">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-4 p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {l.image && <Image src={l.image} alt={l.title} fill sizes="96px" className="object-cover" />}
              </div>
              <div className="flex flex-1 flex-col">
                <Link href={`/products/${l.slug}`} className="font-medium hover:underline">{l.title}</Link>
                <p className="text-sm text-muted-foreground">{formatPrice(l.unit_price, currency)}</p>
                <div className="mt-auto flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    onClick={() => updateQty(l.id, Math.max(1, l.quantity - 1))}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{l.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    onClick={() => updateQty(l.id, l.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => remove(l.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-right text-sm font-semibold">
                {formatPrice(l.unit_price * l.quantity, currency)}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside>
        <Card className="sticky top-20">
          <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal, currency)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(discount, currency)}</span></div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{shipping === 0 ? "Free" : formatPrice(shipping, currency)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span><span>{formatPrice(total, currency)}</span>
            </div>

            <div className="pt-2">
              <div className="flex gap-2">
                <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
                <Button variant="outline" onClick={applyCoupon}>Apply</Button>
              </div>
              {subtotal < freeShippingThreshold && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Add {formatPrice(freeShippingThreshold - subtotal, currency)} for free shipping.
                </p>
              )}
            </div>

            <Button asChild size="lg" className="mt-4 w-full">
              <Link href="/checkout">Proceed to checkout</Link>
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
