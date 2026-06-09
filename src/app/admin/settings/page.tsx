import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createSupabaseAdmin();
  const { data: settings } = await supabase.from("settings").select("*").order("key");

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-3xl font-bold">Settings</h1></header>

      <Card>
        <CardHeader><CardTitle>System</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {(settings ?? []).map((s) => (
                <tr key={s.key} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs">{s.key}</td>
                  <td className="py-2 text-muted-foreground">{s.description}</td>
                  <td className="py-2 text-right font-mono text-xs">{JSON.stringify(s.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
