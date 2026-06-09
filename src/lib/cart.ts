import { createSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import { CART_COOKIE } from "@/lib/constants";

export interface CartLine {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  product: {
    id: string;
    slug: string;
    title: string;
    image: string | null;
  };
}

export interface CartTotals {
  itemsCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

export async function getOrCreateCart() {
  const supabase = await createSupabaseServer();
  const cookieStore = await cookies();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("carts").select("*").eq("user_id", user.id).maybeSingle();
    if (existing) return existing;
    const { data } = await supabase.from("carts")
      .insert({ user_id: user.id }).select().single();
    return data;
  }

  const token = cookieStore.get(CART_COOKIE)?.value;
  if (token) {
    const { data } = await supabase.from("carts").select("*").eq("token", token).maybeSingle();
    if (data) return data;
  }
  const newToken = uuid();
  const { data } = await supabase.from("carts").insert({ token: newToken }).select().single();
  cookieStore.set(CART_COOKIE, newToken, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 90,
  });
  return data;
}

export async function getCartLines(cartId: string): Promise<CartLine[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("cart_items")
    .select(`
      id, cart_id, product_id, variant_id, quantity, unit_price,
      product:products!inner ( id, slug, title, product_images ( url, is_primary, position ) )
    `)
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const productRow = row.product as unknown as {
      id: string; slug: string; title: string;
      product_images?: { url: string; is_primary: boolean; position: number }[];
    };
    const images = productRow?.product_images ?? [];
    const primary = images.find((i) => i.is_primary) ?? images[0];
    return {
      id: row.id,
      cart_id: row.cart_id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      quantity: row.quantity,
      unit_price: Number(row.unit_price),
      product: {
        id: productRow.id,
        slug: productRow.slug,
        title: productRow.title,
        image: primary?.url ?? null,
      },
    };
  });
}

export function computeTotals(
  lines: CartLine[],
  opts: { freeShippingThreshold: number; shippingRate: number; taxRate: number; currency: string; discount?: number }
): CartTotals {
  const itemsCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const discount = opts.discount ?? 0;
  const shipping = subtotal >= opts.freeShippingThreshold ? 0 : opts.shippingRate;
  const tax = (subtotal - discount) * opts.taxRate;
  const total = subtotal - discount + shipping + tax;
  return {
    itemsCount, subtotal: round(subtotal),
    discount: round(discount), shipping: round(shipping),
    tax: round(tax), total: round(total),
    currency: opts.currency,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export async function applyCoupon(code: string, subtotal: number): Promise<{
  ok: boolean; discount: number; free_shipping: boolean; message: string;
}> {
  const supabase = await createSupabaseServer();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*").eq("code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (!coupon) return { ok: false, discount: 0, free_shipping: false, message: "Invalid coupon code." };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { ok: false, discount: 0, free_shipping: false, message: "This coupon has expired." };
  }
  if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
    return { ok: false, discount: 0, free_shipping: false, message: "This coupon is not yet active." };
  }
  if (coupon.usage_limit_total && coupon.used_count >= coupon.usage_limit_total) {
    return { ok: false, discount: 0, free_shipping: false, message: "This coupon has reached its usage limit." };
  }
  if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
    return {
      ok: false, discount: 0, free_shipping: false,
      message: `Add more to qualify (minimum ${coupon.min_order_amount}).`,
    };
  }

  let discount = 0;
  if (coupon.type === "percentage") discount = subtotal * (Number(coupon.value) / 100);
  else if (coupon.type === "fixed_amount") discount = Number(coupon.value);
  if (coupon.max_discount) discount = Math.min(discount, Number(coupon.max_discount));

  return {
    ok: true,
    discount: round(discount),
    free_shipping: Boolean(coupon.free_shipping || coupon.type === "free_shipping"),
    message: "Coupon applied.",
  };
}
