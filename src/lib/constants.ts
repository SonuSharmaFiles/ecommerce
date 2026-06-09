export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ShopFlow";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const DEFAULT_LOCALE = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en") as Locale;
export const DEFAULT_CURRENCY = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "USD") as Currency;

export const LOCALES = ["en", "hi", "ne"] as const;
export type Locale = (typeof LOCALES)[number];

export const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "INR", "NPR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_META: Record<Currency, { symbol: string; name: string; locale: string }> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "€", name: "Euro", locale: "en-IE" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  CAD: { symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  INR: { symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  NPR: { symbol: "रू", name: "Nepalese Rupee", locale: "ne-NP" },
};

export const LOCALE_META: Record<Locale, { label: string; native: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English", native: "English", dir: "ltr" },
  hi: { label: "Hindi", native: "हिन्दी", dir: "ltr" },
  ne: { label: "Nepali", native: "नेपाली", dir: "ltr" },
};

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "fulfilled",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
  "partially_refunded",
  "failed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
  "cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const USER_ROLES = ["customer", "support", "editor", "manager", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES: UserRole[] = ["support", "editor", "manager", "admin", "super_admin"];
export const MANAGER_ROLES: UserRole[] = ["manager", "admin", "super_admin"];

export const PRODUCTS_PER_PAGE = 24;
export const REVIEWS_PER_PAGE = 10;
export const ORDERS_PER_PAGE = 20;

export const CART_COOKIE = "sf_cart";
export const CURRENCY_COOKIE = "sf_currency";
export const LOCALE_COOKIE = "sf_locale";

export const REDIS_KEYS = {
  productList: (key: string) => `products:list:${key}`,
  product: (slug: string) => `products:detail:${slug}`,
  exchangeRates: "rates:current",
  categoryTree: "categories:tree",
  rateLimit: (id: string) => `rl:${id}`,
} as const;
