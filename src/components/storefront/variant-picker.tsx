"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Variant {
  id: string;
  title: string;
  options: Record<string, string>;
  price: number;
  inventory_quantity: number;
  is_active: boolean;
}

export function VariantPicker({
  variants,
  onSelect,
}: {
  variants: Variant[];
  onSelect: (v: Variant | null) => void;
}) {
  const optionNames = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => Object.keys(v.options).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (variants[0]) {
      for (const k of optionNames) init[k] = variants[0].options[k];
    }
    return init;
  });

  if (!variants.length) return null;

  function update(name: string, value: string) {
    const next = { ...selected, [name]: value };
    setSelected(next);
    const match = variants.find((v) =>
      Object.entries(next).every(([k, v]) => v === undefined || v === v && v === v && next[k] === v.toString())
    ) ?? variants.find((v) => optionNames.every((k) => v.options[k] === next[k])) ?? null;
    onSelect(match);
  }

  return (
    <div className="space-y-4">
      {optionNames.map((name) => {
        const values = Array.from(new Set(variants.map((v) => v.options[name]).filter(Boolean)));
        return (
          <div key={name}>
            <div className="mb-1.5 text-sm font-medium capitalize">{name}</div>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const isSelected = selected[name] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update(name, value)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
