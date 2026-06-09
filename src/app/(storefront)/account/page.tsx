import { requireAuth } from "@/lib/rbac";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountOverview() {
  const user = await requireAuth();
  const supabase = await createSupabaseServer();
  const [{ count: ordersCount }, { count: addressCount }, { data: loyalty }] = await Promise.all([
    supabase.from("orders").select("id", { head: true, count: "exact" }).eq("user_id", user.id),
    supabase.from("addresses").select("id", { head: true, count: "exact" }).eq("user_id", user.id),
    supabase.from("loyalty_accounts").select("points").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Welcome back, {user.full_name?.split(" ")[0] ?? "there"}</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle>Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordersCount ?? 0}</div>
            <Link href="/account/orders" className="text-sm text-primary underline">View orders</Link>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addressCount ?? 0}</div>
            <Link href="/account/addresses" className="text-sm text-primary underline">Manage</Link>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Rewards</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyalty?.points ?? 0} pts</div>
            <Link href="/account/loyalty" className="text-sm text-primary underline">See rewards</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
