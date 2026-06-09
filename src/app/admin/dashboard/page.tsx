import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { DollarSign, ShoppingBag, Users, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createSupabaseAdmin();

  const now = new Date();
  const from30 = new Date(now); from30.setDate(now.getDate() - 30);
  const from60 = new Date(now); from60.setDate(now.getDate() - 60);

  const [{ data: recent30 }, { data: recent60 }, { count: customerCount }, { data: latestOrders }] = await Promise.all([
    supabase.from("orders")
      .select("total, status, payment_status, created_at, currency")
      .gte("created_at", from30.toISOString())
      .neq("status", "failed"),
    supabase.from("orders")
      .select("total, status, payment_status, created_at")
      .gte("created_at", from60.toISOString())
      .lt("created_at", from30.toISOString())
      .neq("status", "failed"),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).eq("role", "customer"),
    supabase.from("orders").select("id, order_number, total, currency, status, created_at, email")
      .order("created_at", { ascending: false }).limit(10),
  ]);

  const revenue30 = (recent30 ?? []).reduce((s, o) => s + Number(o.total), 0);
  const revenue60 = (recent60 ?? []).reduce((s, o) => s + Number(o.total), 0);
  const revenueDelta = revenue60 > 0 ? ((revenue30 - revenue60) / revenue60) * 100 : 0;
  const orderCount30 = (recent30 ?? []).length;
  const orderCount60 = (recent60 ?? []).length;
  const orderDelta = orderCount60 > 0 ? ((orderCount30 - orderCount60) / orderCount60) * 100 : 0;
  const aov = orderCount30 > 0 ? revenue30 / orderCount30 : 0;
  const refundCount = (recent30 ?? []).filter((o) => o.status === "refunded" || o.status === "partially_refunded").length;
  const refundRate = orderCount30 > 0 ? (refundCount / orderCount30) * 100 : 0;

  // Build day buckets for the chart
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { revenue: 0, orders: 0 });
  }
  for (const o of recent30 ?? []) {
    const key = o.created_at.slice(0, 10);
    const slot = byDay.get(key);
    if (slot) {
      slot.revenue += Number(o.total);
      slot.orders += 1;
    }
  }
  const chart = Array.from(byDay.entries()).map(([day, v]) => ({
    day: new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    revenue: Math.round(v.revenue * 100) / 100,
    orders: v.orders,
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Last 30 days vs previous 30 days</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={`$${revenue30.toFixed(2)}`} delta={revenueDelta} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Orders" value={String(orderCount30)} delta={orderDelta} icon={<ShoppingBag className="h-5 w-5" />} />
        <StatCard label="Avg order value" value={`$${aov.toFixed(2)}`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Customers" value={String(customerCount ?? 0)} hint="lifetime" icon={<Users className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader>
        <CardContent><RevenueChart data={chart} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Latest orders</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {(latestOrders ?? []).map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{o.order_number}</td>
                    <td className="py-2 text-muted-foreground">{o.email}</td>
                    <td className="py-2 text-right">{o.currency} {Number(o.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Refund rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{refundRate.toFixed(1)}%</div>
            <p className="mt-2 text-sm text-muted-foreground">{refundCount} refunded / {orderCount30} orders (last 30 days)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
