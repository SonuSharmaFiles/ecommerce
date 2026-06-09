"use client";

import Link from "next/link";
import { Search, ShoppingBag, User, Heart, Menu, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/stores/ui-store";
import { CURRENCIES, CURRENCY_META, LOCALES, LOCALE_META, type Currency, type Locale } from "@/lib/constants";
import { CartDrawer } from "./cart-drawer";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/products", key: "shop" },
  { href: "/categories", key: "categories" },
  { href: "/deals", key: "deals" },
  { href: "/blog", key: "blog" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const count = useCartStore((s) => s.count());
  const openCart = useCartStore((s) => s.open);
  const { currency, locale, setCurrency, setLocale } = useUIStore();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass">
      <div className="container flex h-16 items-center gap-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>ShopFlow</SheetTitle>
            </SheetHeader>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {t(l.key as never)}
                </Link>
              ))}
              <Link href="/account" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                {t("account")}
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="inline-block h-7 w-7 rounded-md bg-primary" />
          ShopFlow
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {t(l.key as never)}
            </Link>
          ))}
        </nav>

        {!searchOpen ? (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Language and currency">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                {LOCALES.map((l) => (
                  <DropdownMenuItem key={l} onClick={() => setLocale(l as Locale)}>
                    {LOCALE_META[l as Locale].native}
                    {l === locale && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Currency</DropdownMenuLabel>
                {CURRENCIES.map((c) => (
                  <DropdownMenuItem key={c} onClick={() => setCurrency(c as Currency)}>
                    <span className="font-medium">{c}</span>
                    <span className="ml-2 text-muted-foreground">{CURRENCY_META[c as Currency].symbol}</span>
                    {c === currency && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/wishlist">
              <Button variant="ghost" size="icon" aria-label={t("wishlist")}>
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            <Link href="/account">
              <Button variant="ghost" size="icon" aria-label={t("account")}>
                <User className="h-5 w-5" />
              </Button>
            </Link>

            <Button variant="ghost" size="icon" onClick={openCart} aria-label={t("cart")} className="relative">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
          </div>
        ) : (
          <form action="/products" className="ml-auto flex flex-1 max-w-md items-center gap-2">
            <Input
              autoFocus
              name="q"
              placeholder={t("search_placeholder")}
              className="h-9"
            />
            <Button type="submit" size="sm">Search</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>Cancel</Button>
          </form>
        )}
      </div>

      <CartDrawer />
    </header>
  );
}
