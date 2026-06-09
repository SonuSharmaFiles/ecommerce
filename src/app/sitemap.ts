import type { MetadataRoute } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { APP_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const STATIC: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, freq: "daily" },
  { path: "/products", priority: 0.9, freq: "daily" },
  { path: "/categories", priority: 0.7, freq: "weekly" },
  { path: "/deals", priority: 0.7, freq: "daily" },
  { path: "/blog", priority: 0.7, freq: "weekly" },
  { path: "/about", priority: 0.4, freq: "yearly" },
  { path: "/contact", priority: 0.4, freq: "yearly" },
  { path: "/privacy", priority: 0.3, freq: "yearly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC.map((s) => ({
    url: new URL(s.path, APP_URL).toString(),
    lastModified: now,
    priority: s.priority,
    changeFrequency: s.freq,
  }));

  // If Supabase isn't configured (e.g. at build time without env vars), return static only.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return staticEntries;
  }

  const supabase = createSupabaseAdmin();
  const [{ data: products }, { data: categories }, { data: posts }] = await Promise.all([
    supabase.from("products").select("slug, updated_at").eq("status", "active").limit(20000),
    supabase.from("categories").select("slug, created_at").eq("is_active", true).limit(1000),
    supabase.from("blog_posts").select("slug, updated_at").eq("is_published", true).limit(5000),
  ]);

  const entries: MetadataRoute.Sitemap = [...staticEntries];

  (products ?? []).forEach((p: { slug: string; updated_at?: string }) => entries.push({
    url: new URL(`/products/${p.slug}`, APP_URL).toString(),
    lastModified: new Date(p.updated_at ?? now),
    priority: 0.8,
    changeFrequency: "weekly",
  }));

  (categories ?? []).forEach((c: { slug: string }) => entries.push({
    url: new URL(`/categories/${c.slug}`, APP_URL).toString(),
    lastModified: now,
    priority: 0.6,
    changeFrequency: "weekly",
  }));

  (posts ?? []).forEach((p: { slug: string; updated_at?: string }) => entries.push({
    url: new URL(`/blog/${p.slug}`, APP_URL).toString(),
    lastModified: new Date(p.updated_at ?? now),
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  return entries;
}
