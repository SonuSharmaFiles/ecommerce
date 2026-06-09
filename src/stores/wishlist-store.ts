"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistItemLocal {
  product_id: string;
  slug: string;
  title: string;
  image: string | null;
  price: number;
}

interface WishlistState {
  items: WishlistItemLocal[];
  has: (productId: string) => boolean;
  toggle: (item: WishlistItemLocal) => void;
  add: (item: WishlistItemLocal) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((i) => i.product_id === id),
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.product_id === item.product_id)
            ? { items: s.items.filter((i) => i.product_id !== item.product_id) }
            : { items: [...s.items, item] }
        ),
      add: (item) =>
        set((s) =>
          s.items.some((i) => i.product_id === item.product_id)
            ? s
            : { items: [...s.items, item] }
        ),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.product_id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "shopflow-wishlist" }
  )
);
