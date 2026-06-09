import { complete } from "./claude";
import { SEO_SYSTEM, seoPagePrompt } from "./prompts";

export interface GeneratedSEO {
  title: string;
  description: string;
  keywords: string[];
  faqs: { q: string; a: string }[];
}

export async function generateSEO(args: { topic: string; target?: string; userId?: string }) {
  const text = await complete({
    feature: "seo",
    system: SEO_SYSTEM,
    user: seoPagePrompt(args),
    userId: args.userId,
    cacheSystem: true,
    maxTokens: 800,
  });
  try {
    const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
    return JSON.parse(cleaned) as GeneratedSEO;
  } catch {
    return { title: args.topic, description: args.topic, keywords: [], faqs: [] };
  }
}
