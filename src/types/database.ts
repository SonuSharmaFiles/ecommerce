// Permissive Database shape. Each table maps to `AnyRow` so the Supabase
// client returns usable values regardless of `.select()` string contents.
// Strict Row types still live below — import them directly when you want
// a narrow shape. For full Supabase-side inference, run:
//   npx supabase gen types typescript --local > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = { [k: string]: any };

type AnyTable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Row: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Insert: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Update: any;
  Relationships: [];
};

type Tables = {
  profiles: AnyTable; addresses: AnyTable; audit_logs: AnyTable;
  brands: AnyTable; categories: AnyTable; products: AnyTable;
  product_images: AnyTable; product_variants: AnyTable;
  product_categories: AnyTable; product_specifications: AnyTable;
  product_faqs: AnyTable; product_relations: AnyTable; recently_viewed: AnyTable;
  carts: AnyTable; cart_items: AnyTable;
  orders: AnyTable; order_items: AnyTable; order_events: AnyTable;
  payments: AnyTable; refunds: AnyTable; shipments: AnyTable;
  reviews: AnyTable; coupons: AnyTable; coupon_redemptions: AnyTable;
  wishlists: AnyTable; wishlist_items: AnyTable; saved_carts: AnyTable;
  customer_tags: AnyTable; customer_tag_assignments: AnyTable;
  customer_segments: AnyTable; customer_notes: AnyTable;
  suppliers: AnyTable; supplier_sync_logs: AnyTable; supplier_orders: AnyTable;
  pricing_rules: AnyTable;
  newsletter_subscribers: AnyTable; email_campaigns: AnyTable;
  email_log: AnyTable; sms_log: AnyTable;
  referrals: AnyTable;
  loyalty_tiers: AnyTable; loyalty_accounts: AnyTable; loyalty_transactions: AnyTable;
  affiliates: AnyTable; affiliate_clicks: AnyTable; affiliate_conversions: AnyTable; affiliate_payouts: AnyTable;
  blog_categories: AnyTable; blog_tags: AnyTable; blog_posts: AnyTable; blog_post_tags: AnyTable;
  ai_logs: AnyTable; chat_sessions: AnyTable; chat_messages: AnyTable;
  analytics_events: AnyTable; revenue_daily: AnyTable;
  settings: AnyTable; exchange_rates: AnyTable;
  abandoned_cart_jobs: AnyTable; webhook_events: AnyTable;
  permissions: AnyTable; role_permissions: AnyTable;
  inventory_movements: AnyTable;
};

export interface Database {
  public: {
    Tables: Tables;
    Views: Record<string, AnyTable>;
    Functions: Record<string, { Args: AnyRow; Returns: unknown }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, AnyRow>;
  };
}

export type UserRole = "customer" | "support" | "editor" | "manager" | "admin" | "super_admin";
