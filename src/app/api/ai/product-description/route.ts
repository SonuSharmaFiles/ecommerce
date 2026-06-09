import { NextResponse } from "next/server";
import { generateProductCopy } from "@/lib/ai/descriptions";
import { aiProductCopySchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/rbac";
import { aiLimiter } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const limit = await aiLimiter.limit(ip);
  if (!limit.success) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await request.json();
  const parsed = aiProductCopySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await getCurrentUser();
  const copy = await generateProductCopy({ ...parsed.data, userId: user?.id });
  return NextResponse.json(copy);
}
