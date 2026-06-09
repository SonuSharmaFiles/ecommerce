import { createSupabaseServer } from "@/lib/supabase/server";
import type { ProductCardProduct } from "@/components/storefront/product-card";

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  base_price: number;
  compare_at_price: number | null;
  currency: string;
  rating_avg: number;
  rating_count: number;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_on_sale: boolean;
  product_images: { url: string; is_primary: boolean; position: number }[];
}

function toCard(p: ProductRow): ProductCardProduct {
  const images = p.product_images ?? [];
  const primary = images.find((i) => i.is_primary) ?? images.sort((a, b) => a.position - b.position)[0];
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    short_description: p.short_description,
    base_price: Number(p.base_price),
    compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
    currency: p.currency,
    image: primary?.url ?? null,
    rating_avg: Number(p.rating_avg),
    rating_count: p.rating_count,
    is_new_arrival: p.is_new_arrival,
    is_best_seller: p.is_best_seller,
    is_on_sale: p.is_on_sale,
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardProduct[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select(`id, slug, title, short_description, base_price, compare_at_price, currency, rating_avg, rating_count, is_new_arrival, is_best_seller, is_on_sale, product_images ( url, is_primary, position )`)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => toCard(r as unknown as ProductRow));
}

export async function getNewArrivals(limit = 8): Promise<ProductCardProduct[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select(`id, slug, title, short_description, base_price, compare_at_price, currency, rating_avg, rating_count, is_new_arrival, is_best_seller, is_on_sale, product_images ( url, is_primary, position )`)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => toCard(r as unknown as ProductRow));
}

export async function getBestSellers(limit = 8): Promise<ProductCardProduct[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select(`id, slug, title, short_description, base_price, compare_at_price, currency, rating_avg, rating_count, is_new_arrival, is_best_seller, is_on_sale, product_images ( url, is_primary, position )`)
    .eq("status", "active")
    .order("sales_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => toCard(r as unknown as ProductRow));
}

export async function getOnSaleProducts(limit = 8): Promise<ProductCardProduct[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select(`id, slug, title, short_description, base_price, compare_at_price, currency, rating_avg, rating_count, is_new_arrival, is_best_seller, is_on_sale, product_images ( url, is_primary, position )`)
    .eq("status", "active")
    .eq("is_on_sale", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => toCard(r as unknown as ProductRow));
}

export interface CatalogFilters {
  q?: string;
  category?: string[];
  brand?: string[];
  min?: number;
  max?: number;
  rating?: number;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "rating" | "best_sellers";
  page?: number;
  perPage?: number;
}

export async function searchProducts(filters: CatalogFilters) {
  const supabase = await createSupabaseServer();
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 24;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("products")
    .select(`id, slug, title, short_description, base_price, compare_at_price, currency, rating_avg, rating_count, is_new_arrival, is_best_seller, is_on_sale, product_images ( url, is_primary, position )`,
      { count: "exact" }
    )
    .eq("status", "active");

  if (filters.q) query = query.textSearch("search_vector", filters.q.replace(/\s+/g, " & "));
  if (filters.brand?.length) {
    const { data: brands } = await supabase.from("brands").select("id").in("slug", filters.brand);
    if (brands?.length) query = query.in("brand_id", brands.map((b) => b.id));
  }
  if (filters.category?.length) {
    const { data: cats } = await supabase.from("categories").select("id").in("slug", filters.category);
    if (cats?.length) {
      const { data: ids } = await supabase
        .from("product_categories").select("product_id").in("category_id", cats.map((c) => c.id));
      if (ids?.length) query = query.in("id", ids.map((i) => i.product_id));
    }
  }
  if (typeof filters.min === "number") query = query.gte("base_price", filters.min);
  if (typeof filters.max === "number") query = query.lte("base_price", filters.max);
  if (filters.rating) query = query.gte("rating_avg", filters.rating);

  switch (filters.sort) {
    case "newest":      query = query.order("published_at", { ascending: false, nullsFirst: false }); break;
    case "price_asc":   query = query.order("base_price", { ascending: true }); break;
    case "price_desc":  query = query.order("base_price", { ascending: false }); break;
    case "rating":      query = query.order("rating_avg", { ascending: false }); break;
    case "best_sellers": query = query.order("sales_count", { ascending: false }); break;
    default:            query = query.order("is_featured", { ascending: false }).order("rating_avg", { ascending: false });
  }

  query = query.range(from, to);

  const { data, count } = await query;
  return {
    products: (data ?? []).map((r) => toCard(r as unknown as ProductRow)),
    total: count ?? 0,
    page, perPage,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select(`
      *,
      brand:brands(id, slug, name),
      product_images(*),
      product_variants(*),
      product_specifications(*),
      product_faqs(*),
      categories:product_categories(category:categories(id, slug, name))
    `)
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function getRelatedProducts(productId: string, limit = 6): Promise<ProductCardProduct[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("product_relations")
    .select(`related:related_id ( id, slug, title, short_description, base_price, compare_at_price, currency, rating_avg, rating_count, is_new_arrival, is_best_seller, is_on_sale, product_images ( url, is_primary, position ) )`)
    .eq("product_id", productId)
    .eq("relation_type", "related")
    .limit(limit);

  return (data ?? [])
    .map((r) => (r.related ? toCard(r.related as unknown as ProductRow) : null))
    .filter(Boolean) as ProductCardProduct[];
}

export async function getCategoryTree() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("categories").select("id, slug, name, image_url, parent_id, position")
    .eq("is_active", true).order("position");
  return data ?? [];
}

export async function getBrands() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("brands").select("id, slug, name").order("name");
  return data ?? [];
}
