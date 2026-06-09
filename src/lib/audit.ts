import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface AuditArgs {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

export async function audit(args: AuditArgs) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("audit_logs").insert({
      actor_id: args.actorId ?? null,
      action: args.action,
      resource: args.resource,
      resource_id: args.resourceId,
      before_data: (args.before ?? null) as never,
      after_data: (args.after ?? null) as never,
      ip_address: args.ip,
      user_agent: args.userAgent,
    });
  } catch (err) {
    console.error("[audit] failed", err);
  }
}
