import { NextResponse } from "next/server";
import { devLogin, isDevAuthEnabled, setDevSession } from "@/lib/dev-auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "Dev auth disabled" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = devLogin(parsed.data.email, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  await setDevSession(result.user.id);
  return NextResponse.json({ ok: true, role: result.user.role });
}
