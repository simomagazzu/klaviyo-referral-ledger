// Run with: pnpm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, merge, referrals, quarterTotals, analyze, type Line } from "./core";

const sample = readFileSync(join(__dirname, "__fixtures__/referral-export-sample.txt"), "utf8");
const round = (v: number) => Math.round(v * 100) / 100;

test("parses the fictional sample export", () => {
  const r = parse(sample);
  assert.equal(r.rows.length, 7);
  assert.equal(r.bad.length, 0);
  assert.equal(round(r.rows.reduce((a, x) => a + x.payout, 0)), 113);
});

test("quarter totals match the sample", () => {
  const totals = Object.fromEntries([...quarterTotals(parse(sample).rows)].map(([k, v]) => [k, round(v)]));
  assert.deepEqual(totals, {
    "2025-Q3": 30,
    "2026-Q1": 55,
    "2026-Q2": 23.5,
    "2026-Q3": 4.5,
  });
});

test("pasting the same export twice adds nothing", () => {
  const rows = parse(sample).rows;
  const m = merge(rows, rows);
  assert.equal(m.added, 0);
  assert.equal(m.dup, 7);
});

test("identical lines inside one paste are kept, up to the max count seen", () => {
  const l: Line = { customer: "a.example", start: "2026-01-01", end: "2027-05-01", paid_on: "2026-02-01", product: "SMS", amount: 10, rate: 0.15, split: "", payout: 1.5 };
  assert.equal(merge([], [l, { ...l }]).added, 2);
  assert.equal(merge([l], [l, { ...l }]).added, 1);
});

test("handles the Split % column being present or empty", () => {
  const withSplit = "Example Partner\nx.example\nAug 28, 2026\nFeb 2, 2027\nSep 28, 2026\nSMS\n$130.00\n15%\n100%\n$19.50";
  const without = "Example Partner\nx.example\nAug 29, 2025\nDec 29, 2026\nSep 29, 2026\nEmail\n-$1,300.00\n15%\n-$195.00";
  assert.equal(parse(withSplit).rows[0].split, "100%");
  assert.deepEqual(parse(without).rows[0], {
    customer: "x.example", start: "2025-08-29", end: "2026-12-29", paid_on: "2026-09-29", product: "Email",
    amount: -1300, rate: 0.15, split: "", payout: -195,
  });
});

test("accepts tab-separated rows", () => {
  const tsv = [
    "Partner Account Name\tCustomer Name\tStart\tEnd\tPayment Date\tProduct\tAmount\tRate\tSplit\tEarnings",
    "Example Partner\tnorthwind.example\tAug 29, 2025\tDec 29, 2026\tSep 29, 2026\tEmail\t$300.00\t15%\t\t$45.00",
    "Example Partner\tharbor.example\tAug 28, 2026\tFeb 2, 2027\tSep 28, 2026\tSMS\t$130.00\t15%\t100%\t$19.50",
  ].join("\n");
  const r = parse(tsv);
  assert.equal(r.rows.length, 2);
  assert.equal(r.bad.length, 0);
});

test("rejects the Managed Accounts export", () => {
  const r = parse("Partner Account Name\nCustomer Name\nManaged Earnings %\n");
  assert.match(r.error ?? "", /Managed Accounts export/);
});

test("joins referrals Klaviyo exported as several rows into one window", () => {
  const { list } = referrals(parse(sample).rows);
  const refs = list.filter((r) => r.customer === "northwind.example" && r.product === "SMS");
  assert.equal(refs.length, 1);
  assert.equal(refs[0].start, "2025-07-31");
  assert.equal(refs[0].end, "2026-11-30");
  assert.equal(refs[0].segments.length, 2);
  assert.equal(refs[0].months.toFixed(1), "16.0");
});

test("never joins windows with different rates", () => {
  const { list } = referrals(parse(sample).rows);
  const harbor = list.filter((r) => r.customer === "harbor.example").map((r) => r.rate).sort();
  assert.deepEqual(harbor, [0.15, 0.2]);
});

test("asks whether a cut-short referral churned, and an annual answer clears the question", () => {
  const rows = parse(sample).rows;
  const { list } = referrals(rows);
  const last = rows.reduce((a, r) => (r.paid_on > a ? r.paid_on : a), "");
  const first = rows.reduce((a, r) => (r.paid_on < a ? r.paid_on : a), "9999");
  const ref = list.find((r) => r.customer === "cedar.example" && r.product === "SMS")!;
  const open = analyze(ref, last, null, first);
  assert.match(open.question ?? "", /Did this client churn from SMS\?/);
  assert.equal(open.flagged, true);
  const annual = analyze(ref, last, { status: "annual", text: "" }, first);
  assert.equal(annual.question, null);
  assert.equal(annual.flagged, false);
  assert.ok(annual.cells.some((c) => c.state === "annual"));
});

test("a window a few days past 16 months ends on the cap without a missing-month flag", () => {
  const rows = parse(sample).rows;
  const { list } = referrals(rows);
  const last = rows.reduce((a, r) => (r.paid_on > a ? r.paid_on : a), "");
  const ref = list.find((r) => r.customer === "maple.example" && r.product === "SMS")!;
  const an = analyze(ref, last, null);
  assert.equal(an.cells.at(-1)?.state, "beyond");
  assert.equal(an.flagged, false);
});
