import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { subscribeSchema } from "@/lib/validators";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    const form = await request.formData();
    body = { email: form.get("email"), source: form.get("source") };
  }
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("newsletter_subscribers").upsert(
    { email: parsed.data.email, source: parsed.data.source ?? "footer", is_confirmed: false },
    { onConflict: "email" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
