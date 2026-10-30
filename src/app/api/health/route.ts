import { apiResponse, applyRateLimit } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** Is the app up, and can it reach Postgres? */
export async function GET() {
  const limited = await applyRateLimit("health", RATE_LIMITS.api);
  if (limited) return limited;

  let database = false;
  try {
    const { db } = await import("@/lib/db");
    await db.execute("SELECT 1");
    database = true;
  } catch {
    database = false;
  }
  return apiResponse({ status: "ok", database, timestamp: new Date().toISOString() });
}
