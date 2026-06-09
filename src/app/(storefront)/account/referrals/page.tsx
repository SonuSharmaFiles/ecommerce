import { requireAuth } from "@/lib/rbac";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await requireAuth();
  const supabase = await createSupabaseServer();
  const { data: referrals } = await supabase.from("referrals")
    .select("*").eq("referrer_id", user.id).order("created_at", { ascending: false });

  const code = referrals?.[0]?.code ?? `${user.full_name?.split(" ")[0] ?? "FRIEND"}10`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const url = `${APP_URL}/r/${code}`;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Refer friends</h1>
      <Card>
        <CardHeader><CardTitle>Your referral link</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Give friends 10% off their first order. Get $10 in store credit per signup.
          </p>
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-sm">{url}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Referrals ({referrals?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(referrals ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>{r.referee_email ?? "Pending"}</span>
                <span className="text-muted-foreground capitalize">{r.status.replace(/_/g, " ")}</span>
              </li>
            ))}
            {!referrals?.length && <li className="py-6 text-center text-muted-foreground">No referrals yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
