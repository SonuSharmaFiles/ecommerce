import { NextResponse } from "next/server";
import { getOrCreateCart, getCartLines } from "@/lib/cart";

export async function GET() {
  const cart = await getOrCreateCart();
  if (!cart) return NextResponse.json({ error: "Cart unavailable" }, { status: 500 });
  const lines = await getCartLines(cart.id);
  return NextResponse.json({ cart, lines });
}
