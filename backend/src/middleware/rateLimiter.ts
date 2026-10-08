import type { Context, Next } from 'hono';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skip?: (c: Context) => boolean;
  keyGenerator?: (c: Context) => string;
}

/**
 * In-memory sliding window rate limiter
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // 15 minutes default
  const max = options.max ?? 60; // 60 requests per window default
  const message = options.message ?? 'Too many requests. Please try again in a few minutes.';

  const ipStore = new Map<string, RateLimitRecord>();

  // Cleanup expired entries periodically (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipStore.entries()) {
      if (record.resetAt <= now) {
        ipStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return async (c: Context, next: Next) => {
    // Skip in test environment or custom skip function
    if (process.env.NODE_ENV === 'test' || options.skip?.(c)) {
      return next();
    }

    // Determine client identifier
    let key: string;
    if (options.keyGenerator) {
      key = options.keyGenerator(c);
    } else {
      const forwarded = c.req.header('x-forwarded-for');
      const realIp = c.req.header('x-real-ip');
      const cfIp = c.req.header('cf-connecting-ip');
      key = (forwarded ? forwarded.split(',')[0].trim() : realIp || cfIp || '127.0.0.1');
    }

    const now = Date.now();
    let record = ipStore.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      ipStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', record.resetAt.toString());

    if (record.count > max) {
      c.header('Retry-After', resetSeconds.toString());
      return c.json(
        {
          success: false,
          message,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        429
      );
    }

    return next();
  };
}

/**
 * Preset rate limiter for authentication endpoints:
 * Max 20 requests per 15 minutes per IP address
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});
