import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { markOrderShipped, recordOrderEvent } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum([
    "pending", "processing", "fulfilled", "shipped", "out_for_delivery",
    "delivered", "cancelled", "refunded", "partially_refunded", "failed",
  ]).optional(),
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url: z.string().optional(),
  notes_internal: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: before } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.status === "shipped") {
    await markOrderShipped(id, {
      carrier: parsed.data.carrier,
      trackingNumber: parsed.data.tracking_number,
      trackingUrl: parsed.data.tracking_url,
    });
  } else {
    await supabase.from("orders").update(parsed.data).eq("id", id);
    if (parsed.data.status) {
      await recordOrderEvent(id, parsed.data.status, parsed.data.notes_internal, "admin");
    }
  }

  await audit({ actorId: user.id, action: "update", resource: "order", resourceId: id, before, after: parsed.data });
  return NextResponse.json({ ok: true });
}
