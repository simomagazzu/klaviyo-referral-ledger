import { z } from "zod";
import { apiError, apiResponse, applyRateLimit, parseBody } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { wipeLedger } from "@/lib/ledger/store";

const bodySchema = z.object({ confirm: z.literal("DELETE") });

/** Delete every line, answer and paste. Requires { confirm: "DELETE" }. */
export async function DELETE(req: Request) {
  const limited = await applyRateLimit("ledger-wipe", RATE_LIMITS.destructive);
  if (limited) return limited;
  const { error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;

  try {
    await wipeLedger();
    return apiResponse({ ok: true });
  } catch (err) {
    logger.error("ledger wipe failed", { err: String(err) });
    return apiError("Could not delete the ledger.", 500);
  }
}
