import { requireAuth } from "@/lib/rbac";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const user = await requireAuth();
  const supabase = await createSupabaseServer();
  const [{ data: account }, { data: tiers }, { data: tx }] = await Promise.all([
    supabase.from("loyalty_accounts").select("points, lifetime_points").eq("user_id", user.id).maybeSingle(),
    supabase.from("loyalty_tiers").select("*").order("position"),
    supabase.from("loyalty_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Rewards</h1>

      <Card>
        <CardHeader><CardTitle>Your points</CardTitle></CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{account?.points ?? 0}</div>
          <p className="text-sm text-muted-foreground">Earn 1 point per dollar spent. Redeem at checkout.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tiers</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(tiers ?? []).map((t) => (
              <div key={t.id} className="rounded-md border p-3 text-sm">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.min_points}+ pts · {t.multiplier}× multiplier</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(tx ?? []).map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span className="capitalize">{t.reason.replace(/_/g, " ")}</span>
                <span className={t.delta > 0 ? "text-success" : "text-destructive"}>
                  {t.delta > 0 ? "+" : ""}{t.delta} pts
                </span>
              </li>
            ))}
            {!tx?.length && <li className="py-6 text-center text-muted-foreground">No activity yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
