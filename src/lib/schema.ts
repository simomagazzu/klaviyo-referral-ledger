import { pgTable, text, timestamp, boolean, index, uuid, date, numeric, integer } from "drizzle-orm/pg-core";

// =============================================================================
// REFERRAL LEDGER
// =============================================================================
// Single-user, local-only ledger (no accounts).
// Lines are stored exactly as exported by Klaviyo. Identical lines can
// legitimately repeat (same amount, same day), so there is no unique key:
// dedupe happens in src/lib/ledger/core.ts (merge) before insert.
// =============================================================================

/** One row of the Klaviyo "Referral Revenue Share Details" export. */
export const ledgerLine = pgTable(
  "ledger_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customer: text("customer").notNull(),
    start: date("start", { mode: "string" }).notNull(),
    end: date("end", { mode: "string" }).notNull(),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    product: text("product").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
    rate: numeric("rate", { precision: 6, scale: 4, mode: "number" }).notNull(),
    split: text("split").notNull().default(""),
    payout: numeric("payout", { precision: 14, scale: 2, mode: "number" }).notNull(),
    /** When the paste that added this line happened ("New in last paste"). */
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [index("ledger_line_paid_on_idx").on(t.paidOn), index("ledger_line_added_at_idx").on(t.addedAt)]
);

/** History of pastes into "Add data". */
export const ledgerPaste = pgTable(
  "ledger_paste",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    at: timestamp("at").defaultNow().notNull(),
    added: integer("added").notNull(),
    skipped: integer("skipped").notNull(),
    unreadable: integer("unreadable").notNull(),
  },
  (t) => [index("ledger_paste_at_idx").on(t.at)]
);

/**
 * The owner's answer and note on one referral.
 * referralId = customer|product|rate|start of the joined referral (see core.ts).
 */
export const referralNote = pgTable("referral_note", {
  referralId: text("referral_id").primaryKey(),
  status: text("status", { enum: ["churned", "active", "annual", ""] }).notNull().default(""),
  text: text("text").notNull().default(""),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: date("resolved_at", { mode: "string" }),
  updatedOn: date("updated_on", { mode: "string" }),
});
