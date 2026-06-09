import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./claude";
import { SUPPORT_SYSTEM } from "./prompts";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const MODEL = "claude-opus-4-7" as const;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function chatReply(history: ChatTurn[], sessionId: string): Promise<string> {
  const client = getAnthropic();
  const supabase = createSupabaseAdmin();
  if (!client) {
    return "I'm currently offline (AI not configured). Please email support@shopflow.io and we'll get back to you within a few hours.";
  }

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const t0 = Date.now();
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: [{ type: "text", text: SUPPORT_SYSTEM, cache_control: { type: "ephemeral" } }] as never,
      messages,
    });
    const text = msg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    const usage = msg.usage as Anthropic.Usage & { cache_read_input_tokens?: number };
    await supabase.from("ai_logs").insert({
      feature: "chat",
      model: MODEL,
      prompt_tokens: usage.input_tokens,
      completion_tokens: usage.output_tokens,
      cached_tokens: usage.cache_read_input_tokens ?? 0,
      latency_ms: Date.now() - t0,
      status: "success",
      metadata: { session_id: sessionId },
    });
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("ai_logs").insert({
      feature: "chat",
      model: MODEL,
      status: "error",
      error: message,
      latency_ms: Date.now() - t0,
      metadata: { session_id: sessionId },
    });
    return "Sorry, I hit an error. Please try again, or email support@shopflow.io.";
  }
}
