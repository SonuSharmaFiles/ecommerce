import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  event_name: z.string().min(1),
  url: z.string().optional(),
  referrer: z.string().optional(),
  session_id: z.string().optional(),
  visitor_id: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  revenue: z.number().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = createSupabaseAdmin();
  await supabase.from("analytics_events").insert({
    event_name: parsed.data.event_name,
    url: parsed.data.url,
    referrer: parsed.data.referrer,
    session_id: parsed.data.session_id,
    visitor_id: parsed.data.visitor_id,
    user_agent: request.headers.get("user-agent") ?? null,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    properties: (parsed.data.properties ?? {}) as never,
    revenue: parsed.data.revenue,
    utm_source: parsed.data.utm_source,
    utm_medium: parsed.data.utm_medium,
    utm_campaign: parsed.data.utm_campaign,
  });
  return NextResponse.json({ ok: true });
}
