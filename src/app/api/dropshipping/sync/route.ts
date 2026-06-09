import { NextResponse } from "next/server";
import { syncSupplierPricesAndStock } from "@/lib/dropshipping/sync";
import { requireAdmin } from "@/lib/rbac";

export async function POST(request: Request) {
  await requireAdmin();
  const { supplierId } = await request.json();
  if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });
  const result = await syncSupplierPricesAndStock(supplierId);
  return NextResponse.json(result);
}
