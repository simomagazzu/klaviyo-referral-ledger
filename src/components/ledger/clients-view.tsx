"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { LEDGER_CONFIG } from "@/lib/ledger/config";
import { money } from "@/lib/ledger/core";
import { useLedger } from "./ledger-provider";
import { EmptyLedger, FilterChips, StatusPill, clientHref } from "./primitives";

const STATUS = { All: null, Active: "active", "Expiring soon": "soon", Expired: "expired", "To check": "check" } as const;
type StatusFilter = keyof typeof STATUS;
const ALL_SERVICES = "All services";
const GRID = "grid grid-cols-[minmax(200px,1.4fr)_minmax(220px,1.4fr)_90px_90px_150px_130px] gap-x-4";

export function ClientsView() {
  const router = useRouter();
  const { model } = useLedger();
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [product, setProduct] = useState(ALL_SERVICES);
  const [search, setSearch] = useState("");
  if (model.empty) return <EmptyLedger />;

  const products = [ALL_SERVICES, ...model.products];
  const counts: Record<string, number> = { All: model.clients.length, Active: 0, "Expiring soon": 0, Expired: 0, "To check": 0 };
  model.clients.forEach((c) => {
    counts[c.status === "active" ? "Active" : c.status === "soon" ? "Expiring soon" : "Expired"]++;
    if (c.flagged) counts["To check"]++;
  });
  const prodCounts: Record<string, number> = Object.fromEntries(products.map((p) => [p, 0]));
  model.clients.forEach((c) => {
    prodCounts[ALL_SERVICES]++;
    new Set(c.refs.map((r) => r.product)).forEach((p) => prodCounts[p]++);
  });
  const q = search.trim().toLowerCase();
  const want = STATUS[filter];
  const rows = model.clients.filter(
    (c) =>
      (!want || (want === "check" ? c.flagged > 0 : c.status === want)) &&
      (!q || c.name.toLowerCase().includes(q)) &&
      (product === ALL_SERVICES || c.refs.some((r) => r.product === product))
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-col gap-4">
          <FilterChips label="Status" options={Object.keys(STATUS)} value={filter} counts={counts} onChange={(v) => setFilter(v as StatusFilter)} />
          <FilterChips label="Service" options={products} value={product} counts={prodCounts} onChange={setProduct} />
        </div>
        <label className="flex w-[min(100%,280px)] flex-col gap-2">
          <span className="text-sm font-semibold text-ink">Search client</span>
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="overflow-x-auto rounded-card border border-rule">
        <div role="table" className="min-w-[860px] text-sm">
          <div role="row" className={cn(GRID, "bg-navy-50 px-5 py-3 text-[13px] font-semibold text-ink-muted")}>
            <span role="columnheader">Client</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className="text-right">Referrals</span>
            <span role="columnheader" className="text-right">To check</span>
            <span role="columnheader" className="text-right">Customer paid ($)</span>
            <span role="columnheader" className="text-right">Payout ($)</span>
          </div>
          {!rows.length && <div className="px-5 py-8 text-ink-muted">No clients match.</div>}
          {rows.map((c) => {
            const open = () => router.push(clientHref(c.name));
            return (
              <div
                key={c.name}
                role="row"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
                className={cn(GRID, "cursor-pointer items-center border-t border-rule bg-background px-5 py-3.5 hover:bg-navy-50")}
              >
                <span role="cell" className="flex items-center gap-2 font-semibold">
                  <span className="[overflow-wrap:anywhere]">{c.name}</span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-navy" />
                </span>
                <span role="cell" className="flex">
                  <StatusPill status={c.status}>{c.statusLabel}</StatusPill>
                </span>
                <span role="cell" className="text-right">{c.refs.length}</span>
                <span role="cell" className={cn("text-right", c.flagged ? "font-semibold text-danger" : "text-ink-muted")}>
                  {c.flagged || "–"}
                </span>
                <span role="cell" className="text-right">{money(c.paid)}</span>
                <span role="cell" className="text-right font-semibold text-navy">{money(c.payout)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[13px] text-ink-muted">
        Expiring soon: the window ends within {LEDGER_CONFIG.soonDays} days. To check: a referral has a red check or an open question. Open a
        client to see each month of its windows and record your answers.
      </p>
    </section>
  );
}
