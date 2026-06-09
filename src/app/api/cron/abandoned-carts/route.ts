import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { renderAbandonedCart } from "@/emails/templates";
import { APP_URL } from "@/lib/constants";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdmin();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: carts } = await supabase
    .from("carts")
    .select("id, updated_at, abandoned_email_sent_at, user_id, profile:profiles(email, full_name)")
    .lt("updated_at", cutoff)
    .is("abandoned_email_sent_at", null)
    .not("user_id", "is", null)
    .limit(50);

  let sent = 0;
  for (const c of carts ?? []) {
    const profile = c.profile as unknown as { email?: string; full_name?: string } | null;
    if (!profile?.email) continue;
    try {
      await sendEmail({
        to: profile.email,
        subject: "You left items in your cart",
        html: renderAbandonedCart({ name: profile.full_name, cartUrl: `${APP_URL}/cart` }),
        template: "abandoned_cart",
        relatedType: "cart",
        relatedId: c.id,
      });
      await supabase.from("carts").update({ abandoned_email_sent_at: new Date().toISOString() }).eq("id", c.id);
      sent++;
    } catch (err) {
      console.error("Abandoned cart email failed", err);
    }
  }
  return NextResponse.json({ sent });
}
