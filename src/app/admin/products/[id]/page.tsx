import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();
  const { data: product } = await supabase
    .from("products")
    .select("*, product_images(*), product_variants(*), product_specifications(*), product_faqs(*)")
    .eq("id", id).maybeSingle();
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{product.title}</h1>
          <p className="text-sm text-muted-foreground">/{product.slug}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={product.status === "active" ? "success" : "secondary"}>{product.status}</Badge>
          <Button asChild variant="outline"><Link href={`/products/${product.slug}`}>View live</Link></Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">SKU:</span> {product.sku ?? "—"}</div>
            <div><span className="text-muted-foreground">Price:</span> {product.currency} {Number(product.base_price).toFixed(2)}</div>
            {product.compare_at_price && <div><span className="text-muted-foreground">Compare-at:</span> {product.currency} {Number(product.compare_at_price).toFixed(2)}</div>}
            {product.cost_price && <div><span className="text-muted-foreground">Cost:</span> {product.currency} {Number(product.cost_price).toFixed(2)}</div>}
            <div><span className="text-muted-foreground">Sales:</span> {product.sales_count}</div>
            <div><span className="text-muted-foreground">Views:</span> {product.view_count}</div>
            <div className="pt-2 text-muted-foreground">{product.short_description}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(product.product_variants ?? []).map((v: { id: string; title: string; inventory_quantity: number; price: number }) => (
                <li key={v.id} className="flex justify-between">
                  <span>{v.title}</span>
                  <span><strong>{v.inventory_quantity}</strong> · ${Number(v.price).toFixed(2)}</span>
                </li>
              ))}
              {!product.product_variants?.length && <li className="text-muted-foreground">No variants.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: product.description ?? "<p>No description.</p>" }}
        />
      </Card>
    </div>
  );
}
