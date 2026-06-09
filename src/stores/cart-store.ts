"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartLineLocal {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  title: string;
  image: string | null;
  slug: string;
}

interface CartState {
  lines: CartLineLocal[];
  isOpen: boolean;
  hydrated: boolean;
  setLines: (lines: CartLineLocal[]) => void;
  setHydrated: (hydrated: boolean) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  count: () => number;
  subtotal: () => number;
  upsertLocal: (line: CartLineLocal) => void;
  removeLocal: (id: string) => void;
  updateQtyLocal: (id: string, qty: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      hydrated: false,
      setLines: (lines) => set({ lines }),
      setHydrated: (hydrated) => set({ hydrated }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      count: () => get().lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: () => get().lines.reduce((s, l) => s + l.unit_price * l.quantity, 0),
      upsertLocal: (line) =>
        set((s) => {
          const existing = s.lines.find(
            (l) => l.product_id === line.product_id && l.variant_id === line.variant_id
          );
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.id === existing.id ? { ...l, quantity: l.quantity + line.quantity } : l
              ),
            };
          }
          return { lines: [...s.lines, line] };
        }),
      removeLocal: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      updateQtyLocal: (id, qty) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, qty) } : l)),
        })),
    }),
    { name: "shopflow-cart" }
  )
);
