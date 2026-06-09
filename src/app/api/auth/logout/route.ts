import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { clearDevSession, isDevAuthEnabled } from "@/lib/dev-auth";

export async function POST() {
  if (isDevAuthEnabled()) {
    await clearDevSession();
  } else {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
