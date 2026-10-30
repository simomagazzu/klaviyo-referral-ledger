"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LEDGER_CONFIG } from "@/lib/ledger/config";
import { fdate, money, pct, qOf, quarter, toCSV, type Line, type QuarterResult } from "@/lib/ledger/core";
import { answerLabel, type CheckedReferral, type LedgerModel } from "@/lib/ledger/model";
import { useLedger } from "./ledger-provider";
import { ChoiceChips, EmptyLedger, Figure, FilterChips, MonthsBadge, PaymentLines, Tag, clientHref } from "./primitives";

type Sel = { all: true; y: null; q: null } | { all: false; y: number; q: number | null };

const ALL_SERVICES = "All services";
const SHOW_ALL = "All payments";
const SHOW_NEW = "New in last paste";
const GRID =
  "grid grid-cols-[minmax(150px,1.3fr)_110px_56px_minmax(280px,2.2fr)_80px_120px_100px_72px] gap-x-4";

function useSelection(model: LedgerModel): [Sel, (s: { y?: number; q?: number | null; all?: boolean; show?: string }) => void, boolean] {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const lastQ = qOf(model.last || "2000-01-01");
  const y = Number(params.get("y"));
  const q = params.get("q") ? Number(params.get("q")) : null;
  let sel: Sel;
  if (params.get("all")) sel = { all: true, y: null, q: null };
  else if (y && model.years.includes(y)) sel = { all: false, y, q: q && q >= 1 && q <= 4 ? q : null };
  else sel = { all: false, y: lastQ.y, q: lastQ.q };
  const onlyNew = params.get("show") === "new" && !!model.batch;
  const go = (s: { y?: number; q?: number | null; all?: boolean; show?: string }) => {
    const p = new URLSearchParams();
    if (s.all) p.set("all", "1");
    else {
      if (s.y) p.set("y", String(s.y));
      if (s.q) p.set("q", String(s.q));
    }
    const show = s.show ?? (onlyNew ? "new" : "");
    if (show) p.set("show", show);
    router.replace(path + (p.size ? "?" + p : ""), { scroll: false });
  };
  return [sel, go, onlyNew];
}

export function QuartersView() {
  const { model } = useLedger();
  if (model.empty) return <EmptyLedger />;
  return <Quarters model={model} />;
}

function Quarters({ model }: { model: LedgerModel }) {
  const [sel, go, onlyNew] = useSelection(model);
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState(ALL_SERVICES);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const lastQ = qOf(model.last);
  const yearMode = !sel.all && !sel.q;
  const P = sel.all ? "all time" : yearMode ? String(sel.y) : `Q${sel.q} ${sel.y}`;
  const products = [ALL_SERVICES, ...model.products];
  const prod = products.includes(product) ? product : ALL_SERVICES;
  const qs = search.trim().toLowerCase();
  const filtered = prod !== ALL_SERVICES || !!qs;

  const Qall = quarter(model.lines, sel.y, sel.q, model.bySeg);
  const lineOk = (r: Line) =>
    (!onlyNew || r.added === model.batch) && (prod === ALL_SERVICES || r.product === prod) && (!qs || r.customer.toLowerCase().includes(qs));
  const Q = onlyNew || filtered ? quarter(model.lines, sel.y, sel.q, model.bySeg, lineOk) : Qall;

  const prodCounts: Record<string, number> = Object.fromEntries(products.map((p) => [p, 0]));
  Qall.rows.forEach((g) => {
    prodCounts[ALL_SERVICES]++;
    prodCounts[g.ref.product]++;
  });
  const newInQ = model.batch ? Qall.rows.reduce((a, g) => a + g.lines.filter((l) => l.added === model.batch).length, 0) : 0;

  const rows = Q.rows.map((g) => {
    const r = g.ref as CheckedReferral;
    // only the months of the selected period
    const inPeriod = (start: string) => {
      if (sel.all) return true;
      const qq = qOf(start);
      return qq.y === sel.y && (yearMode || qq.q === sel.q);
    };
    const missing = r.an.resolved ? [] : r.an.cells.filter((c) => inPeriod(c.start) && c.state === "missing");
    const mids = missing.filter((c) => !c.trailing).map((c) => c.label);
    const trails = missing.filter((c) => c.trailing).map((c) => c.label);
    const issues: { text: string; tone: "danger" | "warning" }[] = [];
    if (mids.length) issues.push({ text: `No line in ${mids.join(", ")}.`, tone: "danger" });
    if (trails.length)
      issues.push(
        r.note?.status === "active"
          ? { text: `No line in ${trails.join(", ")}: payouts stopped before the window ended, and the client did not churn.`, tone: "danger" }
          : { text: `No line in ${trails.join(", ")}: payouts stopped before the window ended. Did this client churn?`, tone: "warning" }
      );
    const flag = !r.an.resolved && ((r.monthsOff && !r.an.windowExcused) || missing.length > 0);
    const nNew = model.batch ? g.lines.filter((l) => l.added === model.batch).length : 0;
    return { g, r, issues, flagged: flag || g.pctOff, nNew };
  });
  const flags = rows.filter((x) => x.flagged).length;

  const tag =
    (onlyNew ? "-new" : "") + (prod !== ALL_SERVICES ? "-" + prod.toLowerCase().replace(/\W+/g, "-") : "") + (qs ? "-filtered" : "");
  const exportCSV = () => downloadCSV(Q, `klaviyo-referral-${sel.all ? "all-time" : sel.q ? `${sel.y}-Q${sel.q}` : sel.y}${tag}.csv`);

  const title =
    (sel.all ? "All-time payout" : yearMode ? (sel.y === lastQ.y ? `Payout so far in ${sel.y}` : `${sel.y} payout`) : `${P} payout`) +
    (onlyNew ? ", new in last paste" : "");
  const E = LEDGER_CONFIG.expectedMonths;

  return (
    <section className="flex flex-col gap-6">
      {/* period */}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
        <div className="min-w-max flex-none">
          <ChoiceChips
            label="Year"
            options={["All time", ...model.years.map(String)]}
            value={sel.all ? "All time" : String(sel.y)}
            onChange={(v) => (v === "All time" ? go({ all: true }) : go({ y: +v, q: null }))}
          />
        </div>
        {!sel.all && (
          <div role="group" aria-label="Period" className="grid min-w-[min(100%,620px)] flex-1 grid-cols-[repeat(5,minmax(110px,1fr))] gap-2 max-sm:grid-cols-2">
            <PeriodTile
              label="Full year"
              amount={"$" + money([1, 2, 3, 4].reduce((a, q) => a + (model.totals.get(`${sel.y}-Q${q}`) || 0), 0))}
              on={yearMode}
              onPick={() => go({ y: sel.y, q: null })}
            />
            {[1, 2, 3, 4].map((q) => {
              const v = model.totals.get(`${sel.y}-Q${q}`);
              return (
                <PeriodTile
                  key={q}
                  label={`Q${q}`}
                  amount={v === undefined ? "No payments" : "$" + money(v)}
                  on={q === sel.q}
                  onPick={() => go({ y: sel.y, q })}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* headline */}
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-4 pb-2">
        <div className="flex flex-wrap items-end gap-x-12 gap-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-ink-muted">{title}</span>
            <span className="text-5xl leading-[1.05] font-medium tracking-[-0.02em] text-navy">${money(Q.payout)}</span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 pb-1.5 text-sm text-ink-muted">
            <Figure label="Customer paid" value={"$" + money(Q.paid)} />
            <Figure label="Payments" value={Q.payments} />
            <Figure label="Referrals" value={Q.rows.length} />
            {flags > 0 && (
              <span className="font-semibold whitespace-nowrap text-danger">
                {flags} referral{flags === 1 ? "" : "s"} to check
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          {sel.all ? "Export all-time CSV" : `Export ${P} CSV`}
          <Download aria-hidden />
        </Button>
      </div>

      {yearMode && <YearChart model={model} year={sel.y!} onPick={(q) => go({ y: sel.y!, q })} />}

      {/* filters */}
      <div className="flex flex-col gap-4 rounded-card bg-navy-50 px-6 py-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <label className="flex w-[min(100%,280px)] flex-col gap-2">
            <span className="text-sm font-semibold text-ink">Search client</span>
            <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <FilterChips label="Service" options={products} value={prod} counts={prodCounts} onChange={setProduct} />
        </div>
        {(!!model.batch || filtered) && (
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            {!!model.batch && (
              <FilterChips
                label="Show"
                options={[SHOW_ALL, SHOW_NEW]}
                value={onlyNew ? SHOW_NEW : SHOW_ALL}
                counts={{ [SHOW_ALL]: Qall.payments, [SHOW_NEW]: newInQ }}
                onChange={(v) => go({ ...(sel.all ? { all: true } : { y: sel.y, q: sel.q }), show: v === SHOW_NEW ? "new" : "" })}
              />
            )}
            {filtered && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
                <span>Totals below cover the filtered referrals only.</span>
                <Button
                  variant="link"
                  onClick={() => {
                    setProduct(ALL_SERVICES);
                    setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-card border border-rule">
        <div role="table" className="min-w-[1120px] text-sm">
          <div role="row" className={cn(GRID, "bg-navy-50 px-5 py-3 text-[13px] font-semibold text-ink-muted")}>
            <span role="columnheader">Customer</span>
            <span role="columnheader">Product</span>
            <span role="columnheader" className="text-right">Rate</span>
            <span role="columnheader">Window</span>
            <span role="columnheader" className="text-right">Months expected</span>
            <span role="columnheader" className="text-right">Customer paid ($)</span>
            <span role="columnheader" className="text-right">Payout ($)</span>
            <span role="columnheader" className="text-right">Actual %</span>
          </div>
          {!rows.length && (
            <div className="px-5 py-8 text-ink-muted">
              {filtered
                ? "No referrals match the search and service filter."
                : onlyNew
                  ? `No new lines in ${P} from the last paste.`
                  : `No referral payments in ${P}.`}
            </div>
          )}
          {rows.map(({ g, r, issues, nNew }) => {
            const isOpen = !!open[r.id];
            const toggle = () => setOpen((s) => ({ ...s, [r.id]: !s[r.id] }));
            return (
              <div key={r.id} role="rowgroup" className="border-t border-rule">
                <div
                  role="row"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                  className={cn(GRID, "cursor-pointer items-start px-5 py-3.5 hover:bg-navy-50", isOpen ? "bg-navy-50" : "bg-background")}
                >
                  <span role="cell" className="flex min-w-0 items-start gap-2 font-semibold text-ink">
                    <ChevronDown
                      aria-hidden
                      className={cn("mt-0.5 size-4 shrink-0 text-navy transition-transform duration-150 ease-snap", !isOpen && "-rotate-90")}
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="[overflow-wrap:anywhere]">{r.customer}</span>
                      {nNew > 0 && !onlyNew && <Tag tone="new">{nNew} new</Tag>}
                    </span>
                  </span>
                  <span role="cell">{r.product}</span>
                  <span role="cell" className="text-right">{pct(r.rate)}</span>
                  <span role="cell" className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="whitespace-nowrap">
                        {fdate(r.start)} → {fdate(r.end)}
                      </span>
                      <MonthsBadge r={r} />
                      {r.note?.status && <Tag tone="neutral">{answerLabel(r.note.status)}</Tag>}
                    </span>
                    {r.segments.length > 1 && <span className="text-xs text-ink-muted">{r.segments.length} rows in export, joined</span>}
                    {issues.map((i) => (
                      <span key={i.text} className={cn("text-xs font-medium", i.tone === "danger" ? "text-danger" : "text-warning")}>
                        {i.text}
                      </span>
                    ))}
                    {r.an.resolved && <Tag tone="success">Resolved</Tag>}
                  </span>
                  <span role="cell" className="text-right">{r.expected ?? "n/d"}</span>
                  <span role="cell" className="text-right">{money(g.paid)}</span>
                  <span role="cell" className="text-right font-semibold text-navy">{money(g.payout)}</span>
                  <span role="cell" className={cn("text-right", g.pctOff ? "font-semibold text-danger" : "text-ink")}>
                    {g.actual === null ? "n/d" : pct(g.actual)}
                  </span>
                </div>
                {isOpen && (
                  <div className="flex flex-col gap-3 bg-navy-50 pt-1 pr-5 pb-4 pl-11">
                    <PaymentLines lines={g.lines} batch={model.batch} />
                    <div>
                      <Button variant="link" asChild>
                        <Link href={clientHref(r.customer)}>
                          Open {r.customer}
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div role="row" className={cn(GRID, "bg-navy-900 px-5 py-3.5 font-semibold text-on-navy")}>
            <span className="col-span-5">
              Total {P}
              {onlyNew ? ", new lines only" : ""}
              {filtered ? ", filtered" : ""}
            </span>
            <span className="text-right">{money(Q.paid)}</span>
            <span className="text-right">{money(Q.payout)}</span>
            <span className="text-right">{Q.paid ? pct(Q.payout / Q.paid) : "n/d"}</span>
          </div>
        </div>
      </div>

      <div className="flex max-w-[90ch] flex-col gap-1.5 text-[13px] text-ink-muted">
        <span>Quarter = calendar quarter of the payment date. Payout per line = Revenue Share Earnings % × customer payment.</span>
        <span>
          Months expected: 15% → {E["0.15"]} (stated by Klaviyo); 20% → {E["0.2"]} and 10% → {E["0.1"]} (inferred from the data).
        </span>
        <span>
          Red: window length differs from months expected, a month of this period inside the window has no line, or the actual payout %
          differs from the rate. Your answers on the client page clear what they explain. A referral Klaviyo exports as several rows is
          joined into one.
        </span>
      </div>
    </section>
  );
}

function PeriodTile({ label, amount, on, onPick }: { label: string; amount: string; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-control border px-4 py-3 text-left transition-[background,border-color] duration-150 ease-snap",
        on ? "border-navy bg-navy text-on-navy" : "border-rule-strong bg-background text-ink hover:border-navy hover:bg-navy-50"
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-base font-medium tabular-nums">{amount}</span>
    </button>
  );
}

function YearChart({ model, year, onPick }: { model: LedgerModel; year: number; onPick: (q: number) => void }) {
  const qv = (y: number, q: number) => model.totals.get(`${y}-Q${q}`);
  const maxV = Math.max(1, ...[1, 2, 3, 4].map((q) => qv(year, q) || 0));
  const bars = [1, 2, 3, 4].map((q) => {
    const v = qv(year, q), prev = q === 1 ? qv(year - 1, 4) : qv(year, q - 1);
    let delta = "", tone = "text-ink-muted";
    if (v !== undefined && prev) {
      const p = (v - prev) / prev;
      const flat = Math.abs(p) < 0.0005;
      delta = flat ? "= 0%" : (p > 0 ? "▲ +" : "▼ −") + (Math.abs(p) * 100).toFixed(0) + "%";
      tone = flat ? "text-ink-muted" : p > 0 ? "text-success" : "text-danger";
    }
    return { q, v, delta, tone, h: v ? Math.max(4, Math.round((v / maxV) * 200)) : 0, vs: q === 1 ? `vs Q4 ${year - 1}` : `vs Q${q - 1}` };
  });
  return (
    <figure className="m-0 flex flex-col gap-3 rounded-panel border border-rule p-6">
      <div role="list" className="grid grid-cols-4 items-end gap-4">
        {bars.map((b) => (
          <button
            key={b.q}
            role="listitem"
            type="button"
            title={b.vs}
            onClick={() => onPick(b.q)}
            className="flex h-[300px] flex-col items-stretch justify-end gap-2 rounded-control text-center text-ink hover:bg-navy-50"
          >
            <span className="text-base font-semibold text-navy tabular-nums">{b.v === undefined ? "No payments" : "$" + money(b.v)}</span>
            {b.delta && <span className={cn("text-[13px] font-semibold", b.tone)}>{b.delta}</span>}
            <span className="mx-auto block w-[min(100%,96px)] rounded-t-tag bg-navy" style={{ height: b.h }} />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4 border-t border-rule-strong pt-2">
        {bars.map((b) => (
          <span key={b.q} className="text-center text-sm font-semibold text-ink-muted">
            Q{b.q}
          </span>
        ))}
      </div>
      <figcaption className="text-[13px] text-ink-muted">
        Payout per quarter in {year}. Change against the quarter before. Click a quarter to open it.
      </figcaption>
    </figure>
  );
}

function downloadCSV(Q: QuarterResult, name: string) {
  const head = [
    "Quarter", "Customer", "Product", "Rate", "Referral start", "Referral end", "Window months", "Months expected", "Paid on",
    "Export window start", "Export window end", "Customer paid", "Payout", "Actual %", "Checks", "Answer", "Note",
  ];
  const rows: unknown[][] = [head];
  Q.rows.forEach((g) => {
    const r = g.ref as CheckedReferral;
    const checks = [...r.an.issues, ...(r.an.question ? ["Open question: churned?"] : [])].join(" ");
    g.lines
      .slice()
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on))
      .forEach((l) => {
        const qq = qOf(l.paid_on);
        rows.push([
          `${qq.y}-Q${qq.q}`, r.customer, r.product, pct(r.rate), r.start, r.end, r.months.toFixed(1), r.expected ?? "", l.paid_on, l.start,
          l.end, l.amount.toFixed(2), l.payout.toFixed(2), l.amount ? pct(l.payout / l.amount) : "", checks,
          r.note?.status ? answerLabel(r.note.status) : "", r.note?.text ?? "",
        ]);
      });
  });
  rows.push(["Total", "", "", "", "", "", "", "", "", "", "", Q.paid.toFixed(2), Q.payout.toFixed(2), "", "", "", ""]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + toCSV(rows)], { type: "text/csv" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
