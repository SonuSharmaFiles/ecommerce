import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { apiLimiter, authLimiter } from "@/lib/ratelimit";
import { DEV_AUTH_COOKIE, isDevAuthEnabled } from "@/lib/dev-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -- Rate limiting on API + auth --
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("x-real-ip")
          ?? "anon";

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/auth/")) {
    const r = await authLimiter.limit(ip);
    if (!r.success) {
      return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    }
  } else if (pathname.startsWith("/api/")) {
    const r = await apiLimiter.limit(ip);
    if (!r.success) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }
  }

  // -- Dev auth fast path (skips Supabase entirely) --
  if (isDevAuthEnabled()) {
    if (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/login")) {
      const devSession = request.cookies.get(DEV_AUTH_COOKIE)?.value;
      if (!devSession) {
        return NextResponse.redirect(new URL(`/auth/login?next=${pathname}`, request.url));
      }
    }
    return NextResponse.next({ request });
  }

  // -- Session refresh + admin RBAC guard (real Supabase path) --
  const { response, user, supabase } = await updateSession(request);

  if (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/login")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/auth/login?next=${pathname}`, request.url));
    }
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    const role = (profile as { role?: string } | null)?.role;
    if (!role || !["support", "editor", "manager", "admin", "super_admin"].includes(role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|opengraph-image|robots.txt|sitemap.xml|manifest.json|.*\\..*).*)",
  ],
};
