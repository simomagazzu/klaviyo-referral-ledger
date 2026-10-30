import { z } from "zod";

// Ledger backup file. Same shape as the prototype's "Save ledger file" (version 2),
// so a file saved from the old browser-only ledger can be opened here.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const fileLineSchema = z.object({
  customer: z.string().min(1).max(300),
  start: isoDate,
  end: isoDate,
  paid_on: isoDate,
  product: z.string().min(1).max(200),
  amount: z.number().finite(),
  rate: z.number().finite().min(0).max(1),
  split: z.string().max(20).default(""),
  payout: z.number().finite(),
  added: z.string().optional(),
});

export const fileNoteSchema = z.object({
  status: z.enum(["churned", "active", "annual", ""]).default(""),
  text: z.string().max(5000).default(""),
  at: z.string().nullish(),
  resolved: z.boolean().optional(),
  resolvedAt: z.string().nullish(),
});

export const filePasteSchema = z.object({
  at: z.string(),
  added: z.number().int().min(0),
  dup: z.number().int().min(0),
  bad: z.number().int().min(0),
});

export const ledgerFileSchema = z.object({
  app: z.literal("klaviyo-referral-ledger").optional(),
  version: z.number().optional(),
  savedAt: z.string().optional(),
  lines: z.array(fileLineSchema).max(100_000),
  notes: z.record(z.string().max(500), fileNoteSchema).default({}),
  pastes: z.array(filePasteSchema).max(10_000).default([]),
});

export type LedgerFile = z.infer<typeof ledgerFileSchema>;
