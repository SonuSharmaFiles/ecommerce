import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memCounters = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(limit: number, windowMs: number) {
  return async (key: string) => {
    const now = Date.now();
    const entry = memCounters.get(key);
    if (!entry || entry.resetAt < now) {
      memCounters.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: limit - 1, reset: now + windowMs };
    }
    entry.count += 1;
    return {
      success: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      reset: entry.resetAt,
    };
  };
}

function makeLimiter(tokens: number, windowSec: number, prefix: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    const fn = inMemoryLimit(tokens, windowSec * 1000);
    return { limit: (id: string) => fn(`${prefix}:${id}`) };
  }
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(tokens, `${windowSec} s`),
    prefix,
    analytics: false,
  });
  return { limit: (id: string) => limiter.limit(id) };
}

// Per-IP API limit, fairly generous
export const apiLimiter = makeLimiter(120, 60, "rl_api");
// Auth: stricter
export const authLimiter = makeLimiter(10, 60, "rl_auth");
// Payment endpoints
export const paymentLimiter = makeLimiter(20, 60, "rl_pay");
// AI usage
export const aiLimiter = makeLimiter(20, 60, "rl_ai");
