// Server-side persistence for the ledger (Postgres via Drizzle).
// The whole ledger is loaded at once on purpose: every view (quarter totals, referral
// joining, month-by-month checks) needs all lines of a client, and the export grows by
// roughly a hundred lines a quarter. Revisit if it passes ~50k lines.

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerLine, ledgerPaste, referralNote } from "@/lib/schema";
import { merge, parse, type AnswerStatus, type Line, type Note } from "./core";
import type { LedgerFile } from "./file";

export interface PasteRecord {
  at: string; // ISO timestamp
  added: number;
  dup: number;
  bad: number;
}

export interface LedgerData {
  lines: Line[];
  notes: Record<string, Note>;
  pastes: PasteRecord[];
}

const today = () => new Date().toISOString().slice(0, 10);

const lineColumns = {
  customer: ledgerLine.customer,
  start: ledgerLine.start,
  end: ledgerLine.end,
  paid_on: ledgerLine.paidOn,
  product: ledgerLine.product,
  amount: ledgerLine.amount,
  rate: ledgerLine.rate,
  split: ledgerLine.split,
  payout: ledgerLine.payout,
  addedAt: ledgerLine.addedAt,
};

export async function loadLedger(): Promise<LedgerData> {
  const [lines, notes, pastes] = await Promise.all([
    db.select(lineColumns).from(ledgerLine).orderBy(desc(ledgerLine.paidOn)),
    db
      .select({
        referralId: referralNote.referralId,
        status: referralNote.status,
        text: referralNote.text,
        resolved: referralNote.resolved,
        resolvedAt: referralNote.resolvedAt,
        updatedOn: referralNote.updatedOn,
      })
      .from(referralNote),
    db
      .select({ at: ledgerPaste.at, added: ledgerPaste.added, dup: ledgerPaste.skipped, bad: ledgerPaste.unreadable })
      .from(ledgerPaste)
      .orderBy(desc(ledgerPaste.at))
      .limit(50),
  ]);
  return {
    lines: lines.map(({ addedAt, ...l }) => ({ ...l, added: addedAt.toISOString() })),
    notes: Object.fromEntries(
      notes.map((n) => [
        n.referralId,
        { status: n.status, text: n.text, resolved: n.resolved, resolvedAt: n.resolvedAt, at: n.updatedOn },
      ])
    ),
    pastes: pastes.map((p) => ({ ...p, at: p.at.toISOString() })),
  };
}

export type PasteOutcome = { error: string } | { added: number; dup: number; bad: number };

/** Parse a pasted export and add the lines that are not in the ledger yet. */
export async function addPaste(text: string): Promise<PasteOutcome> {
  const res = parse(text);
  if (res.error) return { error: res.error };
  if (!res.rows.length)
    return {
      error:
        "No referral lines found. Check that you copied the Referral Revenue Share table, with dates, amounts and percentages.",
    };

  return db.transaction(async (tx) => {
    // Serialize concurrent pastes so two identical pastes cannot both insert the same lines.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ledger_paste'))`);
    const existing = await tx.select(lineColumns).from(ledgerLine);
    const m = merge(existing, res.rows);
    const at = new Date();
    if (m.fresh.length) {
      await tx.insert(ledgerLine).values(
        m.fresh.map((r) => ({
          customer: r.customer,
          start: r.start,
          end: r.end,
          paidOn: r.paid_on,
          product: r.product,
          amount: r.amount,
          rate: r.rate,
          split: r.split,
          payout: r.payout,
          addedAt: at,
        }))
      );
    }
    await tx.insert(ledgerPaste).values({ at, added: m.added, skipped: m.dup, unreadable: res.bad.length });
    return { added: m.added, dup: m.dup, bad: res.bad.length };
  });
}

export interface NotePatch {
  status?: AnswerStatus;
  text?: string;
  resolved?: boolean;
}

/** Record the owner's answer, note or resolved flag on one referral. Empty notes are removed. */
export async function setNote(referralId: string, patch: NotePatch) {
  await db.transaction(async (tx) => {
    const [cur] = await tx
      .select({ status: referralNote.status, text: referralNote.text, resolved: referralNote.resolved, resolvedAt: referralNote.resolvedAt })
      .from(referralNote)
      .where(eq(referralNote.referralId, referralId))
      .limit(1);
    const next = {
      status: patch.status ?? cur?.status ?? "",
      text: patch.text ?? cur?.text ?? "",
      resolved: patch.resolved ?? cur?.resolved ?? false,
      resolvedAt: patch.resolved === undefined ? (cur?.resolvedAt ?? null) : patch.resolved ? today() : null,
    };
    if (!next.status && !next.text && !next.resolved) {
      await tx.delete(referralNote).where(eq(referralNote.referralId, referralId));
      return;
    }
    const values = { ...next, updatedOn: today() };
    await tx.insert(referralNote).values({ referralId, ...values }).onConflictDoUpdate({ target: referralNote.referralId, set: values });
  });
}

export async function exportLedger(): Promise<LedgerFile & { app: "klaviyo-referral-ledger"; version: 2; savedAt: string }> {
  const data = await loadLedger();
  return {
    app: "klaviyo-referral-ledger",
    version: 2,
    savedAt: new Date().toISOString(),
    lines: data.lines.map((l) => ({ ...l, added: l.added })),
    notes: Object.fromEntries(
      Object.entries(data.notes).map(([id, n]) => [id, { status: n.status, text: n.text, at: n.at, resolved: n.resolved, resolvedAt: n.resolvedAt }])
    ),
    pastes: data.pastes,
  };
}

const toDate = (s: string | undefined | null, fallback: Date) => {
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(d.getTime()) ? d : fallback;
};
const toDay = (s: string | undefined | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/** Replace the whole ledger with the content of a backup file. */
export async function importLedger(file: LedgerFile) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(ledgerLine);
    await tx.delete(referralNote);
    await tx.delete(ledgerPaste);
    for (let i = 0; i < file.lines.length; i += 1000) {
      await tx.insert(ledgerLine).values(
        file.lines.slice(i, i + 1000).map((r) => ({
          customer: r.customer,
          start: r.start,
          end: r.end,
          paidOn: r.paid_on,
          product: r.product,
          amount: r.amount,
          rate: r.rate,
          split: r.split,
          payout: r.payout,
          addedAt: toDate(r.added, now),
        }))
      );
    }
    const notes = Object.entries(file.notes).filter(([, n]) => n.status || n.text || n.resolved);
    if (notes.length)
      await tx.insert(referralNote).values(
        notes.map(([referralId, n]) => ({
          referralId,
          status: n.status,
          text: n.text,
          resolved: !!n.resolved,
          resolvedAt: toDay(n.resolvedAt),
          updatedOn: toDay(n.at),
        }))
      );
    if (file.pastes.length)
      await tx.insert(ledgerPaste).values(
        file.pastes.map((p) => ({ at: toDate(p.at, now), added: p.added, skipped: p.dup, unreadable: p.bad }))
      );
  });
  return { lines: file.lines.length, notes: Object.keys(file.notes).length };
}

export async function wipeLedger() {
  await db.transaction(async (tx) => {
    await tx.delete(ledgerLine);
    await tx.delete(referralNote);
    await tx.delete(ledgerPaste);
  });
}
