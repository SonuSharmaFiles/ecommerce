import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAdapter } from ".";

interface SyncResult {
  processed: number;
  updated: number;
  failed: number;
  errors: string[];
}

export async function syncSupplierPricesAndStock(supplierId: string): Promise<SyncResult> {
  const supabase = createSupabaseAdmin();
  const { data: supplier } = await supabase
    .from("suppliers").select("id, provider").eq("id", supplierId).single();
  if (!supplier) throw new Error("Supplier not found");

  const adapter = getAdapter(supplier.provider as string);
  if (!adapter) throw new Error(`No adapter for provider ${supplier.provider}`);

  const logId = await startSyncLog(supplierId, "price_stock");

  const { data: products } = await supabase
    .from("products").select("id, supplier_product_id, base_price")
    .eq("supplier_id", supplierId)
    .not("supplier_product_id", "is", null)
    .limit(500);

  const externalIds = (products ?? []).map((p) => p.supplier_product_id!).filter(Boolean);
  if (externalIds.length === 0) {
    await finishSyncLog(logId, "success", { processed: 0, updated: 0, failed: 0 });
    return { processed: 0, updated: 0, failed: 0, errors: [] };
  }

  const result: SyncResult = { processed: externalIds.length, updated: 0, failed: 0, errors: [] };

  try {
    const updates = await adapter.syncPricesAndStock(externalIds);
    for (const product of products ?? []) {
      const update = updates[product.supplier_product_id!];
      if (!update) { result.failed++; continue; }
      const { error } = await supabase.from("products")
        .update({ base_price: update.price })
        .eq("id", product.id);
      if (error) {
        result.failed++; result.errors.push(error.message);
      } else {
        result.updated++;
      }
    }
    await finishSyncLog(logId, "success", result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    result.errors.push(msg);
    await finishSyncLog(logId, "failed", result, msg);
  }
  return result;
}

async function startSyncLog(supplierId: string, type: string) {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from("supplier_sync_logs")
    .insert({ supplier_id: supplierId, sync_type: type, status: "started" })
    .select("id").single();
  return data?.id as number;
}

async function finishSyncLog(
  id: number,
  status: "success" | "failed" | "partial",
  result: { processed: number; updated: number; failed: number },
  error?: string
) {
  const supabase = createSupabaseAdmin();
  await supabase.from("supplier_sync_logs").update({
    status,
    items_processed: result.processed,
    items_updated: result.updated,
    items_failed: result.failed,
    finished_at: new Date().toISOString(),
    error_message: error,
  }).eq("id", id);
}

export async function importProductFromSupplier(args: {
  supplierId: string;
  externalProductId: string;
  markupPercent?: number;
}) {
  const supabase = createSupabaseAdmin();
  const { data: supplier } = await supabase
    .from("suppliers").select("id, provider, name").eq("id", args.supplierId).single();
  if (!supplier) throw new Error("Supplier not found");

  const adapter = getAdapter(supplier.provider as string);
  if (!adapter) throw new Error("No adapter");

  const p = await adapter.getProduct(args.externalProductId);
  if (!p) throw new Error("Product not found from supplier");

  const markup = 1 + (args.markupPercent ?? 80) / 100;
  const basePrice = Number((p.basePrice * markup).toFixed(2));

  const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const { data: existing } = await supabase.from("products").select("id, slug").eq("slug", slug).maybeSingle();
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data: product, error } = await supabase.from("products").insert({
    slug: finalSlug,
    title: p.title,
    description: p.description,
    short_description: p.description?.slice(0, 200),
    base_price: basePrice,
    cost_price: p.basePrice,
    currency: p.currency,
    weight_grams: p.weightGrams,
    supplier_id: args.supplierId,
    supplier_product_id: p.externalId,
    status: "draft",
    is_new_arrival: true,
    metadata: { imported_from: supplier.name, shipping_from: p.shippingFrom },
  }).select("id").single();

  if (error || !product) throw new Error(`Insert failed: ${error?.message}`);

  if (p.imageUrls.length) {
    await supabase.from("product_images").insert(
      p.imageUrls.map((url, i) => ({
        product_id: product.id,
        url,
        position: i,
        is_primary: i === 0,
      }))
    );
  }

  if (p.variants.length) {
    await supabase.from("product_variants").insert(
      p.variants.map((v, i) => ({
        product_id: product.id,
        sku: v.externalId,
        title: v.title,
        options: v.options,
        price: Number((v.price * markup).toFixed(2)),
        cost_price: v.price,
        inventory_quantity: v.inventoryQuantity,
        image_url: v.imageUrl,
        position: i,
      }))
    );
  }

  if (p.attributes.length) {
    await supabase.from("product_specifications").insert(
      p.attributes.map((a, i) => ({
        product_id: product.id, name: a.name, value: a.value, position: i,
      }))
    );
  }

  return product.id;
}
