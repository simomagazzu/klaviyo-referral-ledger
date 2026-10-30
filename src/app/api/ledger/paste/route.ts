import { z } from "zod";
import { apiError, apiResponse, applyRateLimit, parseBody } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { addPaste } from "@/lib/ledger/store";

const bodySchema = z.object({ text: z.string().min(1).max(5_000_000) });

/** Add the lines of a pasted Referral Revenue Share export that are not in the ledger yet. */
export async function POST(req: Request) {
  const limited = await applyRateLimit("ledger-paste", RATE_LIMITS.api);
  if (limited) return limited;
  const { data, error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;

  try {
    const result = await addPaste(data.text);
    if ("error" in result) return apiError(result.error, 422);
    return apiResponse(result);
  } catch (err) {
    logger.error("ledger paste failed", { err: String(err) });
    return apiError("Could not save the paste. Try again.", 500);
  }
}
