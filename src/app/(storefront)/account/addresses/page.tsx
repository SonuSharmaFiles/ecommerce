import { requireAuth } from "@/lib/rbac";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireAuth();
  const supabase = await createSupabaseServer();
  const { data: addresses } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Addresses</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(addresses ?? []).map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-1 pt-6 text-sm">
              <div className="font-medium">{a.full_name}</div>
              <div>{a.line1}</div>
              {a.line2 && <div>{a.line2}</div>}
              <div>{a.city}{a.state ? `, ${a.state}` : ""} {a.postal_code}</div>
              <div>{a.country}</div>
              {a.phone && <div className="text-muted-foreground">{a.phone}</div>}
            </CardContent>
          </Card>
        ))}
        {!addresses?.length && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}
      </div>
    </div>
  );
}
