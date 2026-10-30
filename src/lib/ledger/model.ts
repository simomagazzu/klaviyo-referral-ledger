// Derived ledger model shared by every view: referrals with their month-by-month check,
// clients, totals. Pure; built once per data load.

import {
  analyze,
  clients as buildClients,
  quarterTotals,
  referrals,
  type Analysis,
  type Client,
  type ClientReferral,
  type Line,
  type Note,
  type Referral,
} from "./core";
import type { LedgerData } from "./store";

export interface CheckedReferral extends ClientReferral {
  note: Note | null;
  an: Analysis;
}

export interface CheckedClient extends Omit<Client, "refs"> {
  refs: CheckedReferral[];
  flagged: number;
}

export interface LedgerModel {
  lines: Line[];
  notes: Record<string, Note>;
  pastes: LedgerData["pastes"];
  empty: boolean;
  last: string; // latest payment date in the ledger
  first: string; // earliest payment date
  list: CheckedReferral[];
  bySeg: Map<string, Referral>;
  clients: CheckedClient[];
  totals: Map<string, number>; // "2026-Q3" → payout
  years: number[]; // newest first
  products: string[]; // sorted
  batch: string; // `added` timestamp of the latest paste that added lines ("" if none)
  checks: CheckedReferral[]; // red check or open question, not dismissed
}

export function buildModel(data: LedgerData, today: string): LedgerModel {
  const lines = data.lines;
  const last = lines.reduce((a, r) => (r.paid_on > a ? r.paid_on : a), "");
  const first = lines.reduce((a, r) => (r.paid_on < a ? r.paid_on : a), "9999");
  const { list: refs, bySeg } = referrals(lines);
  // clients() sets the window status on each referral object
  const clientList = buildClients(refs, today);
  const list = refs as CheckedReferral[];
  list.forEach((r) => {
    r.note = data.notes[r.id] ?? null;
    r.an = analyze(r, last, r.note, first);
  });
  const clients = clientList.map((c) => {
    const cr = c.refs as CheckedReferral[];
    return { ...c, refs: cr, flagged: cr.filter((r) => r.an.flagged).length };
  });
  const byName = (a: CheckedReferral, b: CheckedReferral) => a.customer.localeCompare(b.customer) || a.product.localeCompare(b.product);
  return {
    lines,
    notes: data.notes,
    pastes: data.pastes,
    empty: !lines.length,
    last,
    first,
    list,
    bySeg,
    clients,
    totals: quarterTotals(lines),
    years: [...new Set(lines.map((r) => +r.paid_on.slice(0, 4)))].sort((a, b) => b - a),
    products: [...new Set(lines.map((r) => r.product))].sort(),
    batch: lines.reduce((a, r) => (r.added && r.added > a ? r.added : a), ""),
    checks: list.filter((r) => r.an.flagged).sort(byName),
  };
}

export const ANSWERS: { value: Note["status"]; label: string }[] = [
  { value: "churned", label: "Churned" },
  { value: "active", label: "Did not churn" },
  { value: "annual", label: "Billed annually" },
  { value: "", label: "No answer" },
];

export const answerLabel = (status: Note["status"] | undefined) => ANSWERS.find((a) => a.value === (status ?? ""))?.label ?? "No answer";
