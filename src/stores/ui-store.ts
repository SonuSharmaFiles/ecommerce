"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency, Locale } from "@/lib/constants";

interface UIState {
  currency: Currency;
  locale: Locale;
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  setCurrency: (c: Currency) => void;
  setLocale: (l: Locale) => void;
  toggleSearch: () => void;
  toggleMobileMenu: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currency: "USD" as Currency,
      locale: "en" as Locale,
      searchOpen: false,
      mobileMenuOpen: false,
      setCurrency: (currency) => set({ currency }),
      setLocale: (locale) => set({ locale }),
      toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
    }),
    { name: "shopflow-ui", partialize: (s) => ({ currency: s.currency, locale: s.locale }) }
  )
);
