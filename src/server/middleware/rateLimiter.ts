export interface RateLimitConfig {
  windowMs: number; // e.g. 60000 for 1 minute
  maxRequests: number; // e.g. 20 requests per window
  keyPrefix?: string;
}

export const RATE_LIMIT_PRESETS = {
  AI: { windowMs: 60000, maxRequests: 20, keyPrefix: 'ai' },
  OPTIMIZER: { windowMs: 60000, maxRequests: 15, keyPrefix: 'opt' },
  ANALYTICS: { windowMs: 60000, maxRequests: 30, keyPrefix: 'analytics' },
  STANDARD: { windowMs: 60000, maxRequests: 60, keyPrefix: 'std' },
  CRON: { windowMs: 60000, maxRequests: 10, keyPrefix: 'cron' },
  AUTH_SENSITIVE: { windowMs: 60000, maxRequests: 10, keyPrefix: 'auth' },
} as const;

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory sliding window rate limit store
const RATE_LIMIT_STORE = new Map<string, RateLimitRecord>();

/**
 * Evaluates whether a client key has exceeded the rate limit.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number; retryAfterSec: number } {
  const now = Date.now();
  const fullKey = `${config.keyPrefix || 'rl'}:${key}`;
  const existing = RATE_LIMIT_STORE.get(fullKey);

  if (!existing || now > existing.resetTime) {
    // New window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    RATE_LIMIT_STORE.set(fullKey, newRecord);

    // Periodically clean expired keys
    if (RATE_LIMIT_STORE.size > 1000) {
      for (const [k, rec] of RATE_LIMIT_STORE.entries()) {
        if (now > rec.resetTime) {
          RATE_LIMIT_STORE.delete(k);
        }
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
      retryAfterSec: 0,
    };
  }

  if (existing.count >= config.maxRequests) {
    const retryAfterSec = Math.ceil((existing.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfterSec: Math.max(1, retryAfterSec),
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime,
    retryAfterSec: 0,
  };
}

/**
 * Clear the rate limit store (useful for unit tests).
 */
export function clearRateLimitStore(): void {
  RATE_LIMIT_STORE.clear();
}
