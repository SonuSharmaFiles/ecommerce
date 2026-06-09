import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/dropshipping";
import { requireAdmin } from "@/lib/rbac";

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "cj";
  const q = url.searchParams.get("q") ?? "";
  const page = Number(url.searchParams.get("page") ?? 1);
  const adapter = getAdapter(provider);
  if (!adapter) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  const products = await adapter.searchProducts(q, page);
  return NextResponse.json({ products });
}
