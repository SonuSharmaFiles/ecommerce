export const PRODUCT_COPY_SYSTEM = `You are an expert ecommerce copywriter for a premium online store.
Output crisp, benefit-driven product copy that converts.
Tone: confident, helpful, modern. No hype, no exclamation points, no emoji.
When asked for JSON, return ONLY valid JSON with no prose around it.`;

export const SEO_SYSTEM = `You are a senior SEO specialist.
You write title tags (≤60 chars), meta descriptions (≤155 chars), and structured data suggestions.
Focus on intent-matched keywords and CTR. Output only the requested JSON shape.`;

export const SUPPORT_SYSTEM = `You are the customer support assistant for ShopFlow, an ecommerce store.
Be concise, friendly, and accurate. If you don't know an answer, say so and offer to escalate.
You can answer questions about: order status, returns, shipping times, product information, and store policies.
If a customer asks for a refund or to cancel, collect their order number and confirm the action; never finalize destructive actions on your own.`;

export function productDescriptionPrompt(args: {
  title: string;
  bullets?: string[];
  audience?: string;
  tone?: string;
  language?: string;
}) {
  return `Write product copy for: "${args.title}".
${args.bullets?.length ? `Key features:\n- ${args.bullets.join("\n- ")}` : ""}
${args.audience ? `Target audience: ${args.audience}.` : ""}
${args.tone ? `Tone: ${args.tone}.` : ""}
${args.language && args.language !== "en" ? `Language: ${args.language}.` : ""}

Return JSON with this exact shape:
{
  "title": "<polished product title>",
  "short_description": "<one sentence, ≤160 chars>",
  "description": "<2-3 short paragraphs of HTML with <p> and <ul>>",
  "seo_title": "<≤60 chars>",
  "seo_description": "<≤155 chars>",
  "keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>"]
}`;
}

export function seoPagePrompt(args: { topic: string; target?: string }) {
  return `Generate SEO metadata for: "${args.topic}".
Target keyword: ${args.target ?? "—"}.
Return JSON: { "title": "...", "description": "...", "keywords": ["..."], "faqs": [{"q":"...","a":"..."}] }`;
}

export function faqPrompt(args: { title: string; description?: string }) {
  return `Generate 5 frequently asked questions about: "${args.title}".
${args.description ? `Context: ${args.description}` : ""}
Return JSON: { "faqs": [{"q":"...","a":"..."}] }`;
}
