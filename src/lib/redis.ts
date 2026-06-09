import { Redis } from "@upstash/redis";

interface RedisLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  del(key: string | string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

class MemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    try { return JSON.parse(entry.value) as T; } catch { return entry.value as T; }
  }

  async set(key: string, value: string, opts?: { ex?: number }) {
    this.store.set(key, {
      value,
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : undefined,
    });
    return "OK";
  }

  async del(key: string | string[]) {
    if (Array.isArray(key)) key.forEach((k) => this.store.delete(k));
    else this.store.delete(key);
    return 1;
  }

  async incr(key: string) {
    const current = Number((await this.get<string>(key)) ?? 0) + 1;
    await this.set(key, String(current));
    return current;
  }

  async expire(key: string, seconds: number) {
    const entry = this.store.get(key);
    if (entry) entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }
}

let _redis: RedisLike | null = null;

export function getRedis(): RedisLike {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = Redis.fromEnv() as unknown as RedisLike;
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn("[redis] Upstash credentials missing — using in-memory cache (not for production).");
    }
    _redis = new MemoryRedis();
  }
  return _redis;
}

export const redis = getRedis();

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch {/* fall through */}
  const value = await loader();
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {/* ignore */}
  return value;
}

export async function invalidate(keys: string | string[]) {
  try { await redis.del(keys); } catch {/* ignore */}
}
