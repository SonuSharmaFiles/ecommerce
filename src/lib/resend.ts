import { Resend } from "resend";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

let cached: Resend | null = null;

export function getResend() {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template: string;
  relatedType?: string;
  relatedId?: string;
}

export async function sendEmail(args: SendEmailArgs) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL ?? "ShopFlow <noreply@shopflow.io>";
  const supabase = createSupabaseAdmin();

  if (!resend) {
    console.warn(`[email] No RESEND_API_KEY — would send "${args.subject}" to ${args.to}`);
    await supabase.from("email_log").insert({
      recipient: args.to,
      template: args.template,
      subject: args.subject,
      status: "queued",
      related_type: args.relatedType,
      related_id: args.relatedId,
    });
    return { id: "dev-no-key" };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    await supabase.from("email_log").insert({
      recipient: args.to,
      template: args.template,
      subject: args.subject,
      status: "sent",
      provider_id: result.data?.id,
      related_type: args.relatedType,
      related_id: args.relatedId,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("email_log").insert({
      recipient: args.to,
      template: args.template,
      subject: args.subject,
      status: "failed",
      error: message,
      related_type: args.relatedType,
      related_id: args.relatedId,
    });
    throw err;
  }
}
