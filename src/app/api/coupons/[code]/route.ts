import { NextResponse } from "next/server";
import { applyCoupon } from "@/lib/cart";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(request.url);
  const subtotal = Number(url.searchParams.get("subtotal") ?? 0);
  const result = await applyCoupon(code, subtotal);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
