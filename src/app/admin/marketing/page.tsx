import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const supabase = createSupabaseAdmin();
  const [{ count: subscribers }, { count: campaigns }, { count: emailsSent }] = await Promise.all([
    supabase.from("newsletter_subscribers").select("id", { head: true, count: "exact" }),
    supabase.from("email_campaigns").select("id", { head: true, count: "exact" }),
    supabase.from("email_log").select("id", { head: true, count: "exact" }),
  ]);

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-3xl font-bold">Marketing</h1></header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Subscribers</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{subscribers ?? 0}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Campaigns</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{campaigns ?? 0}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Emails sent</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{emailsSent ?? 0}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Newsletter</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage subscribers and send broadcasts.</p>
            <Link href="/admin/marketing/campaigns" className="mt-2 text-sm text-primary underline">Campaigns →</Link>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Abandoned carts</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Recovery emails are scheduled automatically.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
