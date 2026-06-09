"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice } from "@/lib/currency";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function CartDrawer() {
  const { isOpen, close, lines, removeLocal, updateQtyLocal } = useCartStore();
  const currency = useUIStore((s) => s.currency);
  const t = useTranslations("cart");

  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <Button asChild onClick={close}>
              <Link href="/products">{t("continue_shopping")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="-mx-6 flex-1 overflow-y-auto px-6 py-4">
              <ul className="divide-y">
                {lines.map((l) => (
                  <li key={l.id} className="flex gap-3 py-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {l.image && (
                        <Image src={l.image} alt={l.title} fill sizes="80px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <Link href={`/products/${l.slug}`} onClick={close} className="line-clamp-2 text-sm font-medium">
                        {l.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">{formatPrice(l.unit_price, currency)}</p>
                      <div className="mt-auto flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7"
                          onClick={() => updateQtyLocal(l.id, Math.max(1, l.quantity - 1))}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{l.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7"
                          onClick={() => updateQtyLocal(l.id, l.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7"
                          onClick={() => removeLocal(l.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="-mx-6 border-t bg-muted/40 px-6 pb-6 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span className="font-semibold">{formatPrice(subtotal, currency)}</span>
              </div>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
              <Button asChild size="lg" className="mt-4 w-full" onClick={close}>
                <Link href="/checkout">{t("checkout")}</Link>
              </Button>
              <Button asChild variant="link" size="sm" className="mt-2 w-full" onClick={close}>
                <Link href="/cart">View cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
