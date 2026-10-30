// Business constants for the referral ledger. Edit here; every view and check reads from this file.

export interface LedgerConfig {
  /** Window length in months, keyed by the rate rounded to 2 decimals ("0.15"). */
  expectedMonths: Record<string, number>;
  /** A referral is "expiring soon" when its window ends within this many days. */
  soonDays: number;
}

export const LEDGER_CONFIG: LedgerConfig = {
  expectedMonths: {
    "0.1": 12, // inferred from the data: the one 10% window is 12.0 months
    "0.15": 16, // stated by Klaviyo
    "0.2": 24, // inferred from the data: every uncut 20% window is 24.0 months
  },
  soonDays: 60,
};
