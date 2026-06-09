import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const MODEL = "claude-opus-4-7" as const;

let cached: Anthropic | null = null;

export function getAnthropic() {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  cached = new Anthropic({ apiKey: key });
  return cached;
}

export function isAIAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface CompleteArgs {
  feature: string;
  system: string;
  user: string;
  userId?: string;
  maxTokens?: number;
  cacheSystem?: boolean;
}

export async function complete(args: CompleteArgs): Promise<string> {
  const client = getAnthropic();
  const supabase = createSupabaseAdmin();
  const t0 = Date.now();

  if (!client) {
    const fallback = `[AI fallback — set ANTHROPIC_API_KEY for live generation]\n\n${args.user.slice(0, 200)}…`;
    await supabase.from("ai_logs").insert({
      feature: args.feature,
      model: "fallback",
      user_id: args.userId ?? null,
      status: "fallback",
    });
    return fallback;
  }

  try {
    const systemValue = args.cacheSystem
      ? ([{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }] as never)
      : args.system;
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: args.maxTokens ?? 1024,
      system: systemValue,
      messages: [{ role: "user", content: args.user }],
    });
    const text = msg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    const usage = msg.usage as Anthropic.Usage & { cache_read_input_tokens?: number };
    await supabase.from("ai_logs").insert({
      feature: args.feature,
      model: MODEL,
      user_id: args.userId ?? null,
      prompt_tokens: usage.input_tokens,
      completion_tokens: usage.output_tokens,
      cached_tokens: usage.cache_read_input_tokens ?? 0,
      latency_ms: Date.now() - t0,
      status: "success",
    });
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI error";
    await supabase.from("ai_logs").insert({
      feature: args.feature,
      model: MODEL,
      user_id: args.userId ?? null,
      latency_ms: Date.now() - t0,
      status: "error",
      error: message,
    });
    throw err;
  }
}
