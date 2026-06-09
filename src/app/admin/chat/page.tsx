import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = createSupabaseAdmin();
  const { data: sessions } = await supabase
    .from("chat_sessions").select("id, channel, created_at, resolved_at")
    .order("created_at", { ascending: false }).limit(50);

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-3xl font-bold">Customer chat</h1></header>
      <Card>
        <CardHeader><CardTitle>Recent sessions</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(sessions ?? []).map((s) => (
              <li key={s.id} className="flex justify-between py-2">
                <span className="font-mono">{s.id.slice(0, 8)}…</span>
                <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
              </li>
            ))}
            {!sessions?.length && <li className="py-6 text-center text-muted-foreground">No sessions yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
