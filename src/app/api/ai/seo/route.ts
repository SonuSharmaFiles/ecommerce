import { NextResponse } from "next/server";
import { generateSEO } from "@/lib/ai/seo";
import { getCurrentUser } from "@/lib/rbac";
import { z } from "zod";
import { aiLimiter } from "@/lib/ratelimit";

const schema = z.object({ topic: z.string().min(2), target: z.string().optional() });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const r = await aiLimiter.limit(ip);
  if (!r.success) return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const user = await getCurrentUser();
  return NextResponse.json(await generateSEO({ ...parsed.data, userId: user?.id }));
}
