// In-memory rate limiter
// For production / multi-server: replace with Upstash Redis (@upstash/ratelimit)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  max: number;         // max requests per window
  windowMs: number;   // window size in milliseconds
}

export function createRateLimiter({ max, windowMs }: RateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, windowMs);

  return function rateLimiter(key: string): boolean {
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

// Pre-built limiters for common use cases
export const sendMessageLimiter = createRateLimiter({
  max: 5,
  windowMs: 10 * 60 * 1000, // 5 req / 10 min
});

export const authLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000, // 10 req / 15 min
});
