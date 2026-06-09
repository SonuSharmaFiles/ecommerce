"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Star } from "lucide-react";
import { useState, useCallback } from "react";

interface FilterPanelProps {
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
  priceRange: [number, number];
}

export function FilterPanel({ categories, brands, priceRange }: FilterPanelProps) {
  const router = useRouter();
  const params = useSearchParams();

  const [price, setPrice] = useState<[number, number]>([
    Number(params.get("min") ?? priceRange[0]),
    Number(params.get("max") ?? priceRange[1]),
  ]);

  const setParam = useCallback((key: string, value: string | string[] | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || (Array.isArray(value) && value.length === 0)) {
      next.delete(key);
    } else if (Array.isArray(value)) {
      next.set(key, value.join(","));
    } else {
      next.set(key, value);
    }
    next.set("page", "1");
    router.push(`?${next.toString()}`);
  }, [params, router]);

  const selectedCats = (params.get("category") ?? "").split(",").filter(Boolean);
  const selectedBrands = (params.get("brand") ?? "").split(",").filter(Boolean);
  const minRating = Number(params.get("rating") ?? 0);

  return (
    <aside className="sticky top-20 space-y-6 self-start">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Categories</h3>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.slug} className="flex items-center gap-2">
              <Checkbox
                id={`c-${c.slug}`}
                checked={selectedCats.includes(c.slug)}
                onCheckedChange={(v) => {
                  const next = v ? [...selectedCats, c.slug] : selectedCats.filter((s) => s !== c.slug);
                  setParam("category", next);
                }}
              />
              <Label htmlFor={`c-${c.slug}`} className="cursor-pointer">{c.name}</Label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Brands</h3>
        <ul className="space-y-2">
          {brands.map((b) => (
            <li key={b.slug} className="flex items-center gap-2">
              <Checkbox
                id={`b-${b.slug}`}
                checked={selectedBrands.includes(b.slug)}
                onCheckedChange={(v) => {
                  const next = v ? [...selectedBrands, b.slug] : selectedBrands.filter((s) => s !== b.slug);
                  setParam("brand", next);
                }}
              />
              <Label htmlFor={`b-${b.slug}`} className="cursor-pointer">{b.name}</Label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Price</h3>
        <Slider
          value={price}
          min={priceRange[0]}
          max={priceRange[1]}
          step={1}
          onValueChange={(v) => setPrice([v[0], v[1]] as [number, number])}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>${price[0]}</span><span>${price[1]}</span>
        </div>
        <Button
          variant="outline" size="sm" className="mt-3 w-full"
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.set("min", String(price[0]));
            next.set("max", String(price[1]));
            next.set("page", "1");
            router.push(`?${next.toString()}`);
          }}
        >Apply price</Button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((r) => (
            <button
              key={r} onClick={() => setParam("rating", r === minRating ? null : String(r))}
              className={`flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-accent ${minRating === r ? "bg-accent" : ""}`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < r ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">& up</span>
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="ghost" size="sm" className="w-full"
        onClick={() => router.push(window.location.pathname)}
      >Clear all filters</Button>
    </aside>
  );
}
