import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validators";
import { z } from "zod";

const payload = z.object({
  product_id: z.string().uuid(),
  rating: reviewSchema.shape.rating,
  title: reviewSchema.shape.title,
  body: reviewSchema.shape.body,
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const json = await request.json();
  const parsed = payload.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.product_id,
    user_id: user.id,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    body: parsed.data.body ?? null,
    is_approved: false,
    is_verified: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
