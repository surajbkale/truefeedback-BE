import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  max: number;         // max requests per window
  windowMs: number;   // window size in milliseconds
}

function createMemoryLimiter({ max, windowMs }: RateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, windowMs);

  return async function rateLimiter(key: string): Promise<boolean> {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return false; // not limited
    }

    if (entry.count >= max) return true; // limited

    entry.count += 1;
    return false;
  };
}

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export function createRateLimiter({ max, windowMs }: RateLimiterOptions, prefix: string) {
  if (redis) {
    const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));
    const ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s` as any),
      prefix,
      analytics: true,
    });
    return async function(key: string): Promise<boolean> {
      try {
        const { success } = await ratelimit.limit(key);
        return !success; // return true if limited
      } catch (err) {
        console.error(`[RateLimiter] Redis error for ${prefix}:`, err);
        return false; // allow on error
      }
    };
  } else {
    return createMemoryLimiter({ max, windowMs });
  }
}

// Pre-built limiters for common use cases
export const sendMessageLimiter = createRateLimiter({
  max: 5,
  windowMs: 10 * 60 * 1000, // 5 req / 10 min
}, "ratelimit:sendMsg");

export const authLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000, // 10 req / 15 min
}, "ratelimit:auth");
