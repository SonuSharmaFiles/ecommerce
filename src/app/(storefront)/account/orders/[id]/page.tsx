import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/rbac";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuth();
  const supabase = await createSupabaseServer();
  const { data: order } = await supabase
    .from("orders")
    .select(`*, order_items(*), payments(*), shipments(*), order_events(*)`)
    .eq("id", id).maybeSingle();
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Order {order.order_number}</h1>
        <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
        <div className="mt-2 flex gap-2">
          <Badge>{order.status}</Badge>
          <Badge variant="outline">{order.payment_status}</Badge>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {(order.order_items ?? []).map((i: { id: string; product_title: string; quantity: number; total_price: number }) => (
              <li key={i.id} className="flex justify-between py-2 text-sm">
                <span>{i.quantity}× {i.product_title}</span>
                <span>{order.currency} {Number(i.total_price).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{order.currency} {Number(order.subtotal).toFixed(2)}</span></div>
          {Number(order.discount_total) > 0 && (
            <div className="flex justify-between text-success"><span>Discount</span><span>-{order.currency} {Number(order.discount_total).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between"><span>Shipping</span><span>{order.currency} {Number(order.shipping_total).toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{order.currency} {Number(order.total).toFixed(2)}</span></div>
        </CardContent>
      </Card>

      {order.order_events && order.order_events.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {order.order_events.map((e: { id: number; status: string; message: string | null; created_at: string }) => (
                <li key={e.id} className="border-l-2 border-muted pl-3">
                  <div className="font-medium capitalize">{e.status.replace(/_/g, " ")}</div>
                  {e.message && <div className="text-muted-foreground">{e.message}</div>}
                  <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
