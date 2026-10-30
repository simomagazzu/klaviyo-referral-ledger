import { apiError, apiResponse, applyRateLimit, parseBody } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ledgerFileSchema } from "@/lib/ledger/file";
import { importLedger } from "@/lib/ledger/store";

/** Replace the ledger with a backup file (also accepts files saved by the browser-only prototype). */
export async function POST(req: Request) {
  const limited = await applyRateLimit("ledger-import", RATE_LIMITS.destructive);
  if (limited) return limited;
  const { data, error: parseErr } = await parseBody(req, ledgerFileSchema);
  if (parseErr) return parseErr;

  try {
    return apiResponse(await importLedger(data));
  } catch (err) {
    logger.error("ledger import failed", { err: String(err) });
    return apiError("Could not open the ledger file.", 500);
  }
}
