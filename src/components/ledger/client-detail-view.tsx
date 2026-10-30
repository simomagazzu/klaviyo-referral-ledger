"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fdate, money, pct, qOf, type MonthCell } from "@/lib/ledger/core";
import { ANSWERS, answerLabel, type CheckedReferral } from "@/lib/ledger/model";
import { useLedger } from "./ledger-provider";
import { AnswerButtons, ChoiceChips, EmptyLedger, Figure, MonthsBadge, PaymentLines, StatusPill } from "./primitives";

export function ClientDetailView({ name }: { name: string }) {
  const { model } = useLedger();
  if (model.empty) return <EmptyLedger />;
  const c = model.clients.find((x) => x.name === name);
  if (!c)
    return (
      <div className="flex flex-col items-start gap-4 rounded-panel bg-navy-50 px-6 py-12">
        <div className="text-lg font-semibold text-navy">No client called {name}</div>
        <p className="text-ink-muted">It is not in the ledger. Check the name or pick it from the list.</p>
        <Button asChild>
          <Link href="/clients">All clients</Link>
        </Button>
      </div>
    );

  const lines = c.refs.flatMap((r) => r.lines);
  const byQ = new Map<string, number>();
  lines.forEach((l) => {
    const qq = qOf(l.paid_on), k = `${qq.y}-Q${qq.q}`;
    byQ.set(k, (byQ.get(k) || 0) + l.payout);
  });

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="link" asChild>
            <Link href="/clients">All clients</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <h2 className="m-0 text-[32px] font-semibold tracking-[-0.02em] text-navy [overflow-wrap:anywhere]">{c.name}</h2>
          <StatusPill status={c.status} size="lg">
            {c.statusLabel}
          </StatusPill>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-muted">
          <Figure label="Payout" value={"$" + money(c.payout)} strong />
          <Figure label="Customer paid" value={"$" + money(c.paid)} />
          <Figure label="Referrals" value={c.refs.length} />
          <Figure label="Payments" value={lines.length} />
          {c.flagged > 0 && (
            <span className="font-semibold text-danger">
              {c.flagged} referral{c.flagged === 1 ? "" : "s"} to check
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-lg font-semibold text-ink">Payout by quarter</h3>
        <div className="flex flex-wrap gap-2">
          {[...byQ.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, v]) => (
              <Link
                key={k}
                href={`/?y=${k.slice(0, 4)}&q=${k.slice(-1)}`}
                className="flex flex-col items-start gap-0.5 rounded-control border border-rule bg-background px-3.5 py-2.5 text-ink no-underline hover:border-navy hover:bg-navy-50"
              >
                <span className="text-xs font-semibold text-ink-muted">{k}</span>
                <span className="text-[15px] font-medium">${money(v)}</span>
              </Link>
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <h3 className="m-0 text-lg font-semibold text-ink">Referrals</h3>
        {c.refs.map((r) => (
          <ReferralCard key={r.id} r={r} />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-muted">
        <span>
          Each box is one calendar month of the window, by payment date. A line paid in the first days of a month counts for the month before
          when that month has none.
        </span>
        <span>
          <b className="text-danger">No line</b>: a month with no payment line.
        </span>
        <span>
          <b className="text-ink">No line yet</b>: before the first payment, not flagged.
        </span>
        <span>
          <b className="text-ink">Not yet due</b>: after the latest payment in the ledger.
        </span>
        <span>
          <b className="text-ink">Past window</b>: after the months expected for the rate, when the export&apos;s end date runs longer.
        </span>
      </div>
    </section>
  );
}

function ReferralCard({ r }: { r: CheckedReferral }) {
  const { saveNote, busy } = useLedger();
  const note = r.note ?? { status: "" as const, text: "" };
  const [draft, setDraft] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(false);
  const text = draft ?? note.text ?? "";
  const dirty = draft !== null && draft.trim() !== (note.text || "");
  const issues = r.an.issues;
  const hasCheck = issues.length > 0 || !!r.an.question;

  const saveDraft = async () => {
    if (await saveNote(r.id, { text: text.trim() })) setDraft(null);
  };

  return (
    <article className="flex flex-col gap-5 rounded-panel border border-rule bg-background p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xl font-semibold text-navy">
              {r.product} · {pct(r.rate)}
            </span>
            <StatusPill status={r.status} size="sm">
              {r.statusLabel}
            </StatusPill>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              {fdate(r.start)} → {fdate(r.end)}
            </span>
            <MonthsBadge r={r} />
            <span className="text-[13px] text-ink-muted">
              {r.expected === null
                ? "No expected length for this rate"
                : `${r.expected} months expected` + (r.an.windowExcused ? " · shorter because the client churned" : "")}
            </span>
          </div>
          {r.segments.length > 1 && (
            <span className="text-[13px] text-ink-muted">
              Exported as {r.segments.length} rows, joined: {r.segments.map((s) => `${fdate(s.start)} → ${fdate(s.end)}`).join(" and ")}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-2xl font-medium text-navy">${money(r.payout)}</span>
          <span className="text-[13px] text-ink-muted">
            {r.lines.length} payment{r.lines.length === 1 ? "" : "s"} · customer paid ${money(r.paid)}
          </span>
        </div>
      </div>

      {!!r.an.question && !r.an.resolved && (
        <div className="flex flex-col gap-3 rounded-control bg-warning-50 p-4">
          <span className="text-sm font-semibold text-warning">{r.an.question}</span>
          <AnswerButtons disabled={busy} onAnswer={(status) => saveNote(r.id, { status })} />
        </div>
      )}
      {issues.length > 0 && !r.an.resolved && (
        <div className="flex w-fit max-w-full flex-col gap-1 rounded-control bg-danger-50 px-4 py-3">
          {issues.map((t) => (
            <span key={t} className="text-sm font-medium text-danger">
              {t}
            </span>
          ))}
        </div>
      )}
      {hasCheck && !r.an.resolved && (
        <div className="-mt-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => saveNote(r.id, { resolved: true })}>
            Mark as resolved
            <Check aria-hidden />
          </Button>
        </div>
      )}
      {r.an.resolved && (
        <div className="flex w-fit max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-control bg-success-50 px-4 py-3">
          <span className="text-sm font-medium text-success">
            Marked as resolved{note.resolvedAt ? " on " + fdate(note.resolvedAt) : ""}
            {issues.length ? ": " + issues.join(" ") : "."}
          </span>
          <Button variant="link" disabled={busy} onClick={() => saveNote(r.id, { resolved: false })}>
            Reopen
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
        {r.an.cells.map((m) => (
          <MonthBox key={m.key} m={m} />
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 border-t border-rule pt-4">
        <ChoiceChips
          label="Your answer"
          options={ANSWERS.map((a) => a.label)}
          value={answerLabel(note.status)}
          onChange={(label) => saveNote(r.id, { status: ANSWERS.find((a) => a.label === label)?.value ?? "" })}
        />
        <label className="flex min-w-[min(100%,260px)] flex-1 flex-col gap-2">
          <span className="text-sm font-semibold text-ink">Note</span>
          <Input
            value={text}
            placeholder="e.g. churned from SMS in Jul 2026"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirty) saveDraft();
            }}
          />
        </label>
        {dirty && (
          <Button size="sm" disabled={busy} onClick={saveDraft}>
            Save note
          </Button>
        )}
      </div>
      {note.at && <span className="-mt-3 text-xs text-ink-muted">Answer updated {fdate(note.at)}</span>}

      <div className="flex flex-col gap-2">
        <div>
          <Button variant="link" onClick={() => setShowLines((s) => !s)}>
            {showLines ? "Hide payments" : `Show ${r.lines.length} payment${r.lines.length === 1 ? "" : "s"}`}
          </Button>
        </div>
        {showLines && <PaymentLines lines={r.lines} newestFirst />}
      </div>
    </article>
  );
}

const CELL: Record<MonthCell["state"], { box: string; text: string; value?: string }> = {
  paid: { box: "border-navy-50 bg-navy-50", text: "font-medium text-navy" },
  missing: { box: "border-danger bg-danger-50", text: "font-semibold text-danger", value: "No line" },
  pending: { box: "border-dashed border-rule-strong bg-background", text: "text-ink-muted", value: "Not yet due" },
  lead: { box: "border-rule bg-background", text: "text-ink-muted", value: "No line yet" },
  nodata: { box: "border-rule bg-background", text: "text-ink-muted", value: "Before export" },
  churned: { box: "border-navy-100 bg-navy-100", text: "text-ink-muted", value: "Churned" },
  beyond: { box: "border-dashed border-rule bg-background", text: "text-ink-muted", value: "Past window" },
  annual: { box: "border-navy-100 bg-navy-100", text: "text-ink-muted", value: "Annual" },
};

function MonthBox({ m }: { m: MonthCell }) {
  const s = CELL[m.state];
  return (
    <div title={m.count > 1 ? `${m.count} lines` : undefined} className={cn("flex flex-col gap-0.5 rounded-tag border px-2.5 py-2", s.box)}>
      <span className="text-[11px] font-semibold whitespace-nowrap text-ink-muted">{m.label}</span>
      <span className={cn("text-[13px] whitespace-nowrap", s.text)}>{s.value ?? "$" + money(m.payout)}</span>
    </div>
  );
}
