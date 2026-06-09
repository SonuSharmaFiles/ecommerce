import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getOrCreateCart } from "@/lib/cart";
import { z } from "zod";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive().default(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cart = await getOrCreateCart();
  if (!cart) return NextResponse.json({ error: "Cart unavailable" }, { status: 500 });

  const supabase = await createSupabaseServer();
  const priceQuery = parsed.data.variant_id
    ? supabase.from("product_variants").select("price").eq("id", parsed.data.variant_id).single()
    : supabase.from("products").select("base_price").eq("id", parsed.data.product_id).single();

  const { data: priceRow } = await priceQuery;
  if (!priceRow) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const unitPrice = "price" in priceRow ? Number(priceRow.price) : Number(priceRow.base_price);

  const { data: existing } = await supabase.from("cart_items")
    .select("id, quantity").eq("cart_id", cart.id)
    .eq("product_id", parsed.data.product_id)
    .eq("variant_id", parsed.data.variant_id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (existing) {
    await supabase.from("cart_items")
      .update({ quantity: existing.quantity + parsed.data.quantity })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: parsed.data.product_id,
      variant_id: parsed.data.variant_id ?? null,
      quantity: parsed.data.quantity,
      unit_price: unitPrice,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = await createSupabaseServer();
  await supabase.from("cart_items").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
