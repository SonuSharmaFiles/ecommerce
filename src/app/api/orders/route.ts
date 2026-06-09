import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { generateOrderNumber, recordOrderEvent } from "@/lib/orders";
import { z } from "zod";

const lineSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  title: z.string(),
  image: z.string().nullable().optional(),
});

const placeOrderSchema = z.object({
  email: z.string().email(),
  shipping: z.object({
    full_name: z.string().min(2),
    phone: z.string().optional(),
    line1: z.string().min(2),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postal_code: z.string().min(2),
    country: z.string().length(2),
  }),
  billing_same_as_shipping: z.boolean().default(true),
  shipping_method: z.string().default("standard"),
  lines: z.array(lineSchema).min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const userClient = await createSupabaseServer();
  const { data: { user } } = await userClient.auth.getUser();

  const supabase = createSupabaseAdmin();
  const orderNumber = await generateOrderNumber();
  const subtotal = input.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const shipping = subtotal >= 75 ? 0 : 7.5;
  const tax = 0;
  const total = Number((subtotal - 0 + shipping + tax).toFixed(2));
  const currency = "USD";

  const { data: order, error } = await supabase.from("orders").insert({
    order_number: orderNumber,
    user_id: user?.id ?? null,
    email: input.email,
    currency,
    subtotal,
    discount_total: 0,
    shipping_total: shipping,
    tax_total: tax,
    total,
    shipping_address: input.shipping as never,
    billing_address: input.billing_same_as_shipping ? (input.shipping as never) : null,
    shipping_method: input.shipping_method,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    user_agent: request.headers.get("user-agent") ?? null,
    source: "web",
  }).select("id, order_number").single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? "Order creation failed" }, { status: 500 });
  }

  const itemsInsert = input.lines.map((l) => ({
    order_id: order.id,
    product_id: l.product_id,
    variant_id: l.variant_id ?? null,
    product_title: l.title,
    quantity: l.quantity,
    unit_price: l.unit_price,
    total_price: Number((l.unit_price * l.quantity).toFixed(2)),
    image_url: l.image ?? null,
  }));
  await supabase.from("order_items").insert(itemsInsert);
  await recordOrderEvent(order.id, "pending", "Order placed", "system");

  return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, total });
}
