"use client";

import { useRef } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fdate, money, pct, type Line, type WindowState } from "@/lib/ledger/core";
import type { CheckedReferral } from "@/lib/ledger/model";
import { answerLabel } from "@/lib/ledger/model";

// ---------- chips (LOOP ChoiceChips / FilterChips) ----------

const chipClass =
  "inline-flex min-h-10 items-center gap-2 rounded-control border border-rule-strong bg-background px-4 text-sm font-medium text-ink transition-[background,border-color] duration-150 ease-snap hover:border-navy hover:bg-navy-50 aria-checked:border-navy aria-checked:bg-navy aria-checked:text-on-navy aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-on-navy";

/** Single choice with a visible label (radiogroup, arrow keys move). */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = "lbl-" + label.replace(/\W/g, "");
  const active = Math.max(0, options.indexOf(value));
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n]);
    refs.current[n]?.focus();
  };
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={id} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <button
            key={o}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={o === value}
            tabIndex={i === active ? 0 : -1}
            onClick={() => onChange(o)}
            onKeyDown={(e) => onKey(e, i)}
            className={chipClass}
          >
            {o === value && <Check className="size-4" aria-hidden />}
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Filter toggle row with counts (label is for screen readers). */
export function FilterChips({
  label,
  options,
  value,
  onChange,
  counts,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)} className={chipClass}>
          {o}
          {counts?.[o] !== undefined && <span className="text-xs font-semibold tabular-nums opacity-80">{counts[o]}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- pills and tags ----------

const pillTone: Record<WindowState, string> = {
  active: "bg-success-50 text-success",
  soon: "bg-warning-50 text-warning",
  expired: "bg-navy-100 text-ink-muted",
};

export function StatusPill({ status, children, size = "md" }: { status: WindowState; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-semibold whitespace-nowrap",
        size === "lg" ? "px-3 py-1 text-sm" : size === "md" ? "px-2.5 py-1 text-[13px]" : "gap-1.5 px-2.5 py-0.5 text-[13px]",
        pillTone[status]
      )}
    >
      <span className={cn("rounded-full bg-current", size === "sm" ? "size-1.5" : "size-[7px]")} aria-hidden />
      {children}
    </span>
  );
}

type TagTone = "muted" | "neutral" | "danger" | "success" | "new";
const tagTone: Record<TagTone, string> = {
  muted: "bg-navy-100 font-normal text-ink-muted",
  neutral: "bg-navy-100 font-normal text-ink",
  danger: "bg-danger-50 font-semibold text-danger",
  success: "bg-success-50 font-semibold text-success",
  new: "bg-blue-50 font-semibold text-blue",
};

export function Tag({ tone = "muted", children, className }: { tone?: TagTone; children: React.ReactNode; className?: string }) {
  return <span className={cn("w-fit rounded-tag px-2 py-0.5 text-xs whitespace-nowrap", tagTone[tone], className)}>{children}</span>;
}

/** Window length badge: red when it differs from the months expected for the rate (and nothing explains it). */
export function MonthsBadge({ r }: { r: CheckedReferral }) {
  const off = r.monthsOff && !r.an.windowExcused && !r.an.resolved;
  return <Tag tone={off ? "danger" : "muted"}>{r.months.toFixed(1)} mo</Tag>;
}

export function AnswerTag({ r }: { r: CheckedReferral }) {
  if (!r.note?.status) return null;
  return <Tag tone="neutral">{answerLabel(r.note.status)}</Tag>;
}

// ---------- stat line ----------

export function Figure({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      {label} <b className={cn("text-base font-semibold", strong ? "text-navy" : "text-ink")}>{value}</b>
    </span>
  );
}

// ---------- payment lines ----------

export function PaymentLines({ lines, batch, newestFirst }: { lines: Line[]; batch?: string; newestFirst?: boolean }) {
  const sorted = lines.slice().sort((a, b) => (newestFirst ? b.paid_on.localeCompare(a.paid_on) : a.paid_on.localeCompare(b.paid_on)));
  const grid = "grid grid-cols-[130px_minmax(240px,1fr)_140px_120px_90px] gap-x-4";
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className={cn(grid, "border-b border-rule py-2.5 text-xs font-semibold text-ink-muted")}>
          <span>Paid on</span>
          <span>Window in export</span>
          <span className="text-right">Customer paid ($)</span>
          <span className="text-right">Payout ($)</span>
          <span className="text-right">Actual %</span>
        </div>
        {sorted.map((l, i) => {
          const a = l.amount ? l.payout / l.amount : null;
          const off = a !== null && Math.abs(a - l.rate) > 0.001;
          return (
            <div key={i} className={cn(grid, "border-b border-rule py-2 text-[13px]")}>
              <span className="flex items-center gap-1.5">
                {fdate(l.paid_on)}
                {batch && l.added === batch && <span className="text-[11px] font-semibold text-blue">New</span>}
              </span>
              <span className="whitespace-nowrap">
                {fdate(l.start)} → {fdate(l.end)}
              </span>
              <span className="text-right">{money(l.amount)}</span>
              <span className="text-right">{money(l.payout)}</span>
              <span className={cn("text-right", off ? "text-danger" : "text-ink")}>{a === null ? "n/d" : pct(a)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- churn answer ----------

export function AnswerButtons({ onAnswer, disabled }: { onAnswer: (s: "churned" | "active" | "annual") => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAnswer("churned")}>
        Yes, churned
      </Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAnswer("active")}>
        No, did not churn
      </Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAnswer("annual")}>
        Billed annually
      </Button>
    </div>
  );
}

// ---------- empty ledger ----------

export function EmptyLedger() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-panel bg-navy-50 px-6 py-12">
      <div className="text-lg font-semibold text-navy">The ledger is empty</div>
      <p className="max-w-[60ch] text-base text-ink-muted">
        Paste the Referral Revenue Share export from the Klaviyo Partner Portal, or open a saved ledger file.
      </p>
      <Button asChild>
        <Link href="/data">Add data</Link>
      </Button>
    </div>
  );
}

export const clientHref = (name: string) => "/clients/" + encodeURIComponent(name);
