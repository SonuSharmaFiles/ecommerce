import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface SendSMSArgs {
  to: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
}

export async function sendSMS(args: SendSMSArgs) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const supabase = createSupabaseAdmin();

  if (!sid || !token || !from) {
    console.warn(`[sms] Twilio not configured — would send to ${args.to}`);
    await supabase.from("sms_log").insert({
      phone: args.to,
      body: args.body,
      status: "queued",
      related_type: args.relatedType,
      related_id: args.relatedId,
    });
    return { sid: "dev-no-key" };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: args.to, From: from, Body: args.body }),
    });
    if (!res.ok) throw new Error(`Twilio responded ${res.status}`);
    const json = await res.json();
    await supabase.from("sms_log").insert({
      phone: args.to,
      body: args.body,
      status: "sent",
      provider_id: json.sid,
      related_type: args.relatedType,
      related_id: args.relatedId,
    });
    return json;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("sms_log").insert({
      phone: args.to,
      body: args.body,
      status: "failed",
      error: message,
      related_type: args.relatedType,
      related_id: args.relatedId,
    });
    throw err;
  }
}

export function generateOTP(length = 6) {
  let s = "";
  for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 10);
  return s;
}
