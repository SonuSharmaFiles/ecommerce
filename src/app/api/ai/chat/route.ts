import { NextResponse } from "next/server";
import { chatReply } from "@/lib/ai/chat";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { aiLimiter } from "@/lib/ratelimit";
import { v4 as uuid } from "uuid";

const schema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const r = await aiLimiter.limit(ip);
  if (!r.success) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseAdmin();
  let sessionId = parsed.data.sessionId;
  if (!sessionId) {
    const visitorId = request.headers.get("x-visitor-id") ?? uuid();
    const { data: session } = await supabase.from("chat_sessions").insert({
      visitor_id: visitorId, channel: "web",
    }).select("id").single();
    sessionId = session?.id;
  }
  if (!sessionId) return NextResponse.json({ error: "session" }, { status: 500 });

  await supabase.from("chat_messages").insert({ session_id: sessionId, role: "user", content: parsed.data.message });
  const { data: history } = await supabase.from("chat_messages")
    .select("role, content").eq("session_id", sessionId).order("created_at", { ascending: true }).limit(20);

  const reply = await chatReply(
    (history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    sessionId
  );

  await supabase.from("chat_messages").insert({ session_id: sessionId, role: "assistant", content: reply });
  return NextResponse.json({ sessionId, reply });
}
