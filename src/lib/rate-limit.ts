/**
 * In-memory rate limiter using a sliding window approach.
 *
 * This protects your API routes from abuse. Each route can have its own limit.
 * Requests are tracked by IP address.
 *
 * For single-server deployments this works perfectly. If you scale to multiple
 * servers, swap the in-memory store for Redis (the interface stays the same).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/** Default limits for different route types */
export const RATE_LIMITS = {
  /** AI chat — most expensive, tightest limit */
  chat: { maxRequests: 20, windowSeconds: 60 },
  /** General API routes */
  api: { maxRequests: 60, windowSeconds: 60 },
  /** Destructive routes (import, delete all) */
  destructive: { maxRequests: 10, windowSeconds: 60 },
} as const;

// In-memory store. Entries are auto-cleaned on access.
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks (every 5 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

/**
 * Check rate limit for a given key (userId or IP).
 *
 * Usage in an API route:
 *   const result = checkRateLimit(`ledger:${ip}`, RATE_LIMITS.api);
 *   if (!result.success) {
 *     return rateLimitResponse(result);
 *   }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired — start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
      limit: config.maxRequests,
    };
  }

  // Within window — increment
  entry.count += 1;

  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      limit: config.maxRequests,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
    limit: config.maxRequests,
  };
}

/**
 * Build a 429 Too Many Requests response with proper headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil(
    (result.resetAt.getTime() - Date.now()) / 1000
  );

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    }
  );
}
