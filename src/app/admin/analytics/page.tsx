import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createSupabaseAdmin();

  const [{ data: events }, { data: orders }, { data: top }] = await Promise.all([
    supabase.from("analytics_events").select("event_name, utm_source, revenue, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(10000),
    supabase.from("orders").select("user_id, total, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .neq("status", "failed"),
    supabase.from("order_items")
      .select("product_id, product_title, quantity, total_price")
      .gte("total_price", 0)
      .limit(1000),
  ]);

  const pageviews = (events ?? []).filter((e) => e.event_name === "page_view").length;
  const checkouts = (events ?? []).filter((e) => e.event_name === "begin_checkout").length;
  const purchases = (orders ?? []).length;
  const conversionRate = pageviews > 0 ? (purchases / pageviews) * 100 : 0;

  // Repeat purchase rate
  const buyersMap = new Map<string, number>();
  for (const o of orders ?? []) {
    if (o.user_id) buyersMap.set(o.user_id, (buyersMap.get(o.user_id) ?? 0) + 1);
  }
  const totalBuyers = buyersMap.size;
  const repeatBuyers = Array.from(buyersMap.values()).filter((c) => c > 1).length;
  const repeatRate = totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0;

  // Top products
  const productAgg = new Map<string, { title: string; revenue: number; qty: number }>();
  for (const i of top ?? []) {
    if (!i.product_id) continue;
    const cur = productAgg.get(i.product_id) ?? { title: i.product_title, revenue: 0, qty: 0 };
    cur.revenue += Number(i.total_price);
    cur.qty += i.quantity;
    productAgg.set(i.product_id, cur);
  }
  const topProducts = Array.from(productAgg.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Traffic sources
  const sourceAgg = new Map<string, number>();
  for (const e of events ?? []) {
    if (e.event_name === "page_view") {
      const src = e.utm_source ?? "direct";
      sourceAgg.set(src, (sourceAgg.get(src) ?? 0) + 1);
    }
  }
  const topSources = Array.from(sourceAgg.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-3xl font-bold">Analytics</h1></header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Page views" value={pageviews.toLocaleString()} />
        <StatCard label="Begin checkout" value={checkouts.toLocaleString()} />
        <StatCard label="Conversion rate" value={`${conversionRate.toFixed(2)}%`} />
        <StatCard label="Repeat buyers" value={`${repeatRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top products by revenue</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {topProducts.map((p, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span className="line-clamp-1">{p.title}</span>
                  <span>${p.revenue.toFixed(2)}</span>
                </li>
              ))}
              {!topProducts.length && <li className="py-6 text-center text-muted-foreground">No data.</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Traffic sources</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {topSources.map(([src, n]) => (
                <li key={src} className="flex justify-between py-2"><span>{src}</span><span>{n.toLocaleString()}</span></li>
              ))}
              {!topSources.length && <li className="py-6 text-center text-muted-foreground">No data.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
