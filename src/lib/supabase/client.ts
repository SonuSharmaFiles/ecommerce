"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// We intentionally type queries as `any` at the boundary. The hand-written
// row types live in @/types/database for explicit casting when needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = SupabaseClient<any, "public", any>;

let client: Untyped | undefined;

export function createSupabaseBrowser(): Untyped {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as Untyped;
  return client;
}
