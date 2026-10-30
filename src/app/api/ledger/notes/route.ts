import { z } from "zod";
import { apiError, apiResponse, applyRateLimit, parseBody } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { setNote } from "@/lib/ledger/store";

const bodySchema = z.object({
  referralId: z.string().min(1).max(500),
  status: z.enum(["churned", "active", "annual", ""]).optional(),
  text: z.string().max(5000).optional(),
  resolved: z.boolean().optional(),
});

/** Save the owner's answer, note or resolved flag on one referral. */
export async function POST(req: Request) {
  const limited = await applyRateLimit("ledger-notes", RATE_LIMITS.api);
  if (limited) return limited;
  const { data, error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;

  try {
    const { referralId, ...patch } = data;
    await setNote(referralId, { ...patch, text: patch.text?.trim() });
    return apiResponse({ ok: true });
  } catch (err) {
    logger.error("ledger note failed", { err: String(err) });
    return apiError("Could not save the answer. Try again.", 500);
  }
}
