import { headers } from "next/headers";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
  type RateLimitConfig,
} from "@/lib/rate-limit";
import type { z } from "zod";

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/** Return a JSON success response. */
export function apiResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Return a JSON error response. */
export function apiError(
  message: string,
  status = 400,
  details?: unknown
): Response {
  const body: Record<string, unknown> = { error: message };
  if (details) body.details = details;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// =============================================================================
// RATE LIMIT HELPER
// =============================================================================

/** Extract a rate limit key from the request (client IP). */
export async function getRateLimitKey(prefix: string): Promise<string> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  return `${prefix}:ip:${ip}`;
}

/**
 * Apply rate limiting. Returns null if allowed, or a 429 Response if blocked.
 */
export async function applyRateLimit(
  prefix: string,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<Response | null> {
  const key = await getRateLimitKey(prefix);
  const result = checkRateLimit(key, config);
  if (!result.success) {
    return rateLimitResponse(result);
  }
  return null;
}

// =============================================================================
// BODY PARSING & VALIDATION
// =============================================================================

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns the validated data or an error response.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { data: null, error: apiError("Invalid JSON", 400) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      data: null,
      error: apiError("Validation failed", 400, parsed.error.flatten().fieldErrors),
    };
  }

  return { data: parsed.data, error: null };
}
