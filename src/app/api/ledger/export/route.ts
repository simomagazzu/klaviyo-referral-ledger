import { apiError, applyRateLimit } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { exportLedger } from "@/lib/ledger/store";

/** Download the whole ledger (lines, answers, paste history) as a JSON backup file. */
export async function GET() {
  const limited = await applyRateLimit("ledger-export", RATE_LIMITS.api);
  if (limited) return limited;

  try {
    const file = await exportLedger();
    return new Response(JSON.stringify(file, null, 1), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="klaviyo-referral-ledger-${file.savedAt.slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("ledger export failed", { err: String(err) });
    return apiError("Could not export the ledger.", 500);
  }
}
