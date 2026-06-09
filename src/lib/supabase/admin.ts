import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = SupabaseClient<any, "public", any>;

let cached: Untyped | undefined;

function isDevAuthEnabled() {
  return process.env.DEV_AUTH === "true" || process.env.NEXT_PUBLIC_DEV_AUTH === "true";
}

function looksFakeUrl(url?: string | null) {
  return !url || url.includes("example.supabase.co");
}

/**
 * Service-role client — bypasses RLS. Server-only.
 * In dev-auth mode (no real Supabase project), returns a stub whose
 * queries resolve to empty results so admin pages still render.
 */
export function createSupabaseAdmin(): Untyped {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isDevAuthEnabled() && (looksFakeUrl(url) || !key)) {
    cached = makeStubClient() as unknown as Untyped;
    return cached;
  }

  if (!url || !key) {
    throw new Error("Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Service-Role": "true" } },
  }) as unknown as Untyped;
  return cached;
}

// ---- Stub client (dev only) ---------------------------------------------

interface StubResult { data: unknown; error: null; count: number | null }

function emptyResult(): StubResult {
  return { data: [], error: null, count: 0 };
}

function singleResult(): StubResult {
  return { data: null, error: null, count: 0 };
}

function makeQueryBuilder(): unknown {
  const promise: Promise<StubResult> & Record<string, unknown> = Object.assign(
    Promise.resolve(emptyResult()),
    {} as Record<string, unknown>
  );

  const chainable = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is",
    "in", "contains", "containedBy", "or", "filter", "match",
    "order", "limit", "range", "abortSignal", "not", "textSearch",
    "throwOnError", "returns",
  ];
  for (const m of chainable) {
    (promise as Record<string, unknown>)[m] = () => makeQueryBuilder();
  }
  (promise as Record<string, unknown>).single = () =>
    Promise.resolve(singleResult());
  (promise as Record<string, unknown>).maybeSingle = () =>
    Promise.resolve(singleResult());
  return promise;
}

function makeStubClient() {
  return {
    from() { return makeQueryBuilder(); },
    rpc() { return Promise.resolve(singleResult()); },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    storage: { from: () => ({}) },
  };
}
