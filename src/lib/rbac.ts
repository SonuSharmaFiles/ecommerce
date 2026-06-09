import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ADMIN_ROLES, MANAGER_ROLES, type UserRole } from "@/lib/constants";
import { getDevSessionUser, isDevAuthEnabled } from "@/lib/dev-auth";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  locale: string;
  currency: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Dev auth path (gated by DEV_AUTH=true)
  if (isDevAuthEnabled()) {
    const devUser = await getDevSessionUser();
    if (devUser) {
      return {
        id: devUser.id,
        email: devUser.email,
        full_name: devUser.full_name,
        avatar_url: null,
        role: devUser.role,
        locale: "en",
        currency: "USD",
      };
    }
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, locale, currency")
    .eq("id", user.id)
    .single();
  return (profile as CurrentUser | null) ?? null;
}

export async function requireAuth(redirectTo = "/auth/login") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireRole(roles: UserRole[], redirectTo = "/") {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) redirect(redirectTo);
  return user;
}

export async function requireAdmin() {
  return requireRole(ADMIN_ROLES, "/");
}

export async function requireManager() {
  return requireRole(MANAGER_ROLES, "/admin/dashboard");
}

const PERMISSIONS: Record<UserRole, string[]> = {
  customer: [],
  support: ["admin.access", "order.read", "order.write", "customer.read", "customer.write"],
  editor: ["admin.access", "blog.manage", "product.read"],
  manager: [
    "admin.access", "product.read", "product.write",
    "order.read", "order.write",
    "customer.read", "coupon.manage", "analytics.read",
  ],
  admin: [
    "admin.access", "product.read", "product.write", "product.delete",
    "order.read", "order.write", "order.refund",
    "customer.read", "customer.write",
    "coupon.manage", "supplier.manage", "marketing.manage",
    "analytics.read", "blog.manage", "settings.manage",
  ],
  super_admin: ["*"],
};

export function hasPermission(role: UserRole, permission: string) {
  const perms = PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

export async function requirePermission(permission: string, redirectTo = "/admin/dashboard") {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, permission)) redirect(redirectTo);
  return user;
}
