"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fdate, money, pct } from "@/lib/ledger/core";
import { answerLabel, type CheckedReferral } from "@/lib/ledger/model";
import { useLedger } from "./ledger-provider";
import { AnswerButtons, EmptyLedger, Tag, clientHref } from "./primitives";

export function CheckView() {
  const { model, saveNote, busy } = useLedger();
  const [showDismissed, setShowDismissed] = useState(false);
  if (model.empty) return <EmptyLedger />;

  const checks = model.checks;
  const dismissed = model.list
    .filter((r) => r.an.resolved && (r.an.issues.length || r.an.question))
    .sort((a, b) => a.customer.localeCompare(b.customer) || a.product.localeCompare(b.product));

  return (
    <section className="flex flex-col gap-6">
      {checks.length > 0 ? (
        <p className="max-w-[70ch] text-base text-ink-muted">
          {checks.length} referral{checks.length === 1 ? "" : "s"} with a red check or an open question. Answer the question, or dismiss what
          you have looked at.
        </p>
      ) : (
        <div className="rounded-panel bg-navy-50 px-6 py-8 text-base text-ink-muted">
          Nothing to check. Every red check and open question has been answered or dismissed.
        </div>
      )}

      {checks.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-card border border-rule">
          {checks.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-1 items-start gap-x-8 gap-y-3 border-b border-rule bg-background px-6 py-5 last:border-b-0 md:grid-cols-[minmax(220px,1fr)_minmax(0,2.2fr)_auto]"
            >
              <Summary r={r} />
              <div className="flex min-w-0 flex-col gap-2">
                {r.an.issues.map((t) => (
                  <span key={t} className="text-sm font-medium text-pretty text-danger">
                    {t}
                  </span>
                ))}
                {r.an.question && (
                  <div className="flex flex-col gap-2.5 rounded-control bg-warning-50 px-4 py-3">
                    <span className="text-sm font-medium text-pretty text-warning">{r.an.question}</span>
                    <AnswerButtons disabled={busy} onAnswer={(status) => saveNote(r.id, { status })} />
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => saveNote(r.id, { resolved: true })}>
                Dismiss
                <Check aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      )}

      {dismissed.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <Button variant="link" onClick={() => setShowDismissed((s) => !s)}>
              {showDismissed ? "Hide dismissed" : `Show ${dismissed.length} dismissed`}
            </Button>
          </div>
          {showDismissed && (
            <div className="flex flex-col overflow-hidden rounded-card border border-rule">
              {dismissed.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-1 items-start gap-x-8 gap-y-3 border-b border-rule bg-navy-50 px-6 py-4 last:border-b-0 md:grid-cols-[minmax(220px,1fr)_minmax(0,2.2fr)_auto]"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[15px] font-semibold text-ink [overflow-wrap:anywhere]">{r.customer}</span>
                    <span className="text-[13px] text-ink-muted">
                      {r.product} · {pct(r.rate)} · Dismissed{r.note?.resolvedAt ? " on " + fdate(r.note.resolvedAt) : ""}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    {[...r.an.issues, ...(r.an.question ? [r.an.question] : [])].map((t) => (
                      <span key={t} className="text-[13px] text-pretty text-ink-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => saveNote(r.id, { resolved: false })}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Summary({ r }: { r: CheckedReferral }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Link
        href={clientHref(r.customer)}
        className="text-base font-semibold text-navy underline decoration-rule-strong underline-offset-[3px] [overflow-wrap:anywhere] hover:decoration-current"
      >
        {r.customer}
      </Link>
      <span className="text-sm text-ink">
        {r.product} · {pct(r.rate)} · ${money(r.payout)}
      </span>
      <span className="text-[13px] text-ink-muted">
        {fdate(r.start)} → {fdate(r.end)} · {r.months.toFixed(1)} mo
      </span>
      {r.note?.status && (
        <Tag tone="neutral" className="mt-1">
          {answerLabel(r.note.status)}
        </Tag>
      )}
    </div>
  );
}
