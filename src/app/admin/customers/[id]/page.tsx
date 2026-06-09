import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();
  const [{ data: profile }, { data: orders }, { data: notes }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("orders").select("id, order_number, total, currency, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("customer_notes").select("*").eq("user_id", id).order("created_at", { ascending: false }),
  ]);
  if (!profile) notFound();

  const lifetime = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">{profile.full_name ?? profile.email}</h1>
        <p className="text-sm text-muted-foreground">{profile.email} · joined {new Date(profile.created_at).toLocaleDateString()}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{orders?.length ?? 0}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Lifetime spend</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${lifetime.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Role</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold capitalize">{profile.role}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(orders ?? []).map((o) => (
              <li key={o.id} className="flex justify-between py-2"><span>{o.order_number}</span><span>{o.currency} {Number(o.total).toFixed(2)}</span></li>
            ))}
            {!orders?.length && <li className="py-4 text-center text-muted-foreground">No orders yet.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="py-2">
                <p>{n.body}</p>
                <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </li>
            ))}
            {!notes?.length && <li className="py-4 text-center text-muted-foreground">No notes.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
