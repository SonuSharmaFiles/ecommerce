import { complete } from "./claude";
import { PRODUCT_COPY_SYSTEM, productDescriptionPrompt, faqPrompt } from "./prompts";

export interface GeneratedProductCopy {
  title: string;
  short_description: string;
  description: string;
  seo_title: string;
  seo_description: string;
  keywords: string[];
}

function safeParseJSON<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
  try { return JSON.parse(cleaned) as T; } catch { return fallback; }
}

export async function generateProductCopy(args: {
  title: string;
  bullets?: string[];
  audience?: string;
  tone?: string;
  language?: string;
  userId?: string;
}): Promise<GeneratedProductCopy> {
  const text = await complete({
    feature: "product_description",
    system: PRODUCT_COPY_SYSTEM,
    user: productDescriptionPrompt(args),
    userId: args.userId,
    cacheSystem: true,
    maxTokens: 1500,
  });
  return safeParseJSON<GeneratedProductCopy>(text, {
    title: args.title,
    short_description: args.title,
    description: `<p>${args.title}</p>`,
    seo_title: args.title.slice(0, 60),
    seo_description: args.title.slice(0, 155),
    keywords: args.bullets ?? [],
  });
}

export async function generateProductFAQs(args: {
  title: string;
  description?: string;
  userId?: string;
}): Promise<{ q: string; a: string }[]> {
  const text = await complete({
    feature: "faq",
    system: PRODUCT_COPY_SYSTEM,
    user: faqPrompt(args),
    userId: args.userId,
    cacheSystem: true,
    maxTokens: 800,
  });
  const parsed = safeParseJSON<{ faqs: { q: string; a: string }[] }>(text, { faqs: [] });
  return parsed.faqs ?? [];
}
