import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "./admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = SupabaseClient<any, "public", any>;

function looksFakeUrl(url?: string | null) {
  return !url || url.includes("example.supabase.co");
}

function isDevAuthEnabled() {
  return process.env.DEV_AUTH === "true" || process.env.NEXT_PUBLIC_DEV_AUTH === "true";
}

export async function createSupabaseServer(): Promise<Untyped> {
  // In dev mode without a real project, reuse the stub from admin.ts so
  // every page renders without hitting the network.
  if (isDevAuthEnabled() && looksFakeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return createSupabaseAdmin();
  }

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options as CookieOptions);
            }
          } catch {
            // Called from a Server Component — cookies are read-only there.
          }
        },
      },
    }
  ) as unknown as Untyped;
}
