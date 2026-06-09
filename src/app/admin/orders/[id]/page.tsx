import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select(`*, order_items(*), payments(*), shipments(*), order_events(*), supplier_orders(*)`)
    .eq("id", id).maybeSingle();
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Order {order.order_number}</h1>
        <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()} · {order.email}</p>
        <div className="mt-2 flex gap-2">
          <Badge>{order.status}</Badge>
          <Badge variant="outline">{order.payment_status}</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(order.order_items ?? []).map((i: { id: string; product_title: string; variant_title: string | null; quantity: number; total_price: number }) => (
                <li key={i.id} className="flex justify-between py-2 text-sm">
                  <span>{i.quantity}× {i.product_title}{i.variant_title ? ` (${i.variant_title})` : ""}</span>
                  <span>{order.currency} {Number(i.total_price).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Subtotal" value={`${order.currency} ${Number(order.subtotal).toFixed(2)}`} />
            {Number(order.discount_total) > 0 && <Row label="Discount" value={`-${order.currency} ${Number(order.discount_total).toFixed(2)}`} />}
            <Row label="Shipping" value={`${order.currency} ${Number(order.shipping_total).toFixed(2)}`} />
            <Row label="Tax" value={`${order.currency} ${Number(order.tax_total).toFixed(2)}`} />
            <Row label="Total" value={`${order.currency} ${Number(order.total).toFixed(2)}`} strong />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Shipping address</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {order.shipping_address ? (
            <pre className="whitespace-pre-wrap">{JSON.stringify(order.shipping_address, null, 2)}</pre>
          ) : (
            <p className="text-muted-foreground">No address.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Events</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {(order.order_events ?? []).map((e: { id: number; status: string; message: string | null; source: string | null; created_at: string }) => (
              <li key={e.id} className="border-l-2 border-muted pl-3">
                <div className="font-medium capitalize">{e.status.replace(/_/g, " ")}</div>
                {e.message && <div className="text-muted-foreground">{e.message}</div>}
                <div className="text-xs text-muted-foreground">{e.source ?? "system"} · {new Date(e.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t pt-1 font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span><span>{value}</span>
    </div>
  );
}
