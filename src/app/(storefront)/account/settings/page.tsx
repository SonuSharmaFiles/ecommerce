import { requireAuth } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAuth();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Name</div><div>{user.full_name ?? "—"}</div>
            <div className="text-muted-foreground">Email</div><div>{user.email}</div>
            <div className="text-muted-foreground">Currency</div><div>{user.currency}</div>
            <div className="text-muted-foreground">Locale</div><div>{user.locale}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
