// Seed an empty ledger with the fictional sample export. Run: pnpm db:seed
// Add --force to paste the sample into a ledger that already has lines.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { count } from "drizzle-orm";
import { db } from "../src/lib/db";
import { ledgerLine } from "../src/lib/schema";
import { referrals } from "../src/lib/ledger/core";
import { addPaste, loadLedger, setNote } from "../src/lib/ledger/store";

async function main() {
  const [{ n }] = await db.select({ n: count() }).from(ledgerLine);
  if (n > 0 && !process.argv.includes("--force")) {
    console.log(`The ledger already has ${n} lines. Nothing seeded (use --force to paste the sample anyway).`);
    return;
  }

  const text = readFileSync(join(__dirname, "../src/lib/ledger/__fixtures__/referral-export-sample.txt"), "utf8");
  const res = await addPaste(text);
  console.log("Paste:", res);

  const { list } = referrals((await loadLedger()).lines);
  let answers = 0;
  for (const r of list) {
    if (r.customer === "cedar.example" && r.product === "SMS") {
      await setNote(r.id, { status: "churned", text: "Sample answer: the client left this product." });
      answers++;
    }
  }
  console.log(`Sample answers: ${answers}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
