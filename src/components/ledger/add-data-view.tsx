"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fdate, money, pct, qOf } from "@/lib/ledger/core";
import { useLedger } from "./ledger-provider";

const PLACEHOLDER = [
  "Partner Account Name",
  "Customer Name",
  "…",
  "Example Partner",
  "northwind.example",
  "Aug 29, 2025",
  "Dec 29, 2026",
  "Sep 29, 2026",
  "Email",
  "-$100.00",
  "15%",
  "-$15.00",
].join("\n");
const GRID = "grid grid-cols-[90px_minmax(170px,1.3fr)_130px_64px_130px_140px_110px] gap-x-4";

type Msg = { text: string; ok: boolean } | null;

export function AddDataView() {
  const { model, mutate, busy } = useLedger();
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const disabled = busy || saving;

  async function addData() {
    if (!paste.trim()) return setMsg({ text: "The box is empty. Paste the Referral export first.", ok: false });
    setSaving(true);
    const res = await mutate<{ added: number; dup: number; bad: number }>("/api/ledger/paste", {
      method: "POST",
      body: JSON.stringify({ text: paste }),
    });
    setSaving(false);
    if (!res) return;
    const bad = res.bad ? ` ${res.bad} line${res.bad === 1 ? "" : "s"} could not be read.` : "";
    setMsg({ text: `Added ${res.added} new line${res.added === 1 ? "" : "s"}; skipped ${res.dup} already in the ledger.${bad}`, ok: !res.bad });
    if (res.added) setPaste("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    let body: unknown;
    try {
      const j = JSON.parse(await f.text());
      body = Array.isArray(j) ? { lines: j } : j;
    } catch {
      return setMsg({ text: `${f.name} is not a ledger file.`, ok: false });
    }
    setSaving(true);
    const res = await mutate<{ lines: number; notes: number }>("/api/ledger/import", { method: "POST", body: JSON.stringify(body) });
    setSaving(false);
    if (res) setMsg({ text: `Opened ${f.name}: ${res.lines} lines and ${res.notes} answers. This replaced the ledger.`, ok: true });
    else setMsg({ text: `${f.name} is not a ledger file.`, ok: false });
  }

  async function wipe() {
    setSaving(true);
    const res = await mutate("/api/ledger", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) });
    setSaving(false);
    setConfirming(false);
    if (res) setMsg({ text: "All lines deleted.", ok: true });
  }

  const lp = model.pastes[0];
  const newLines = model.batch
    ? model.lines.filter((r) => r.added === model.batch).sort((a, b) => b.paid_on.localeCompare(a.paid_on))
    : [];
  const fdt = (iso: string) => {
    const d = new Date(iso);
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return `${fdate(local)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <section className="flex flex-col gap-12">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-start gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="paste" className="text-sm font-semibold text-ink">
              Referral Revenue Share export
            </label>
            <Textarea
              id="paste"
              rows={16}
              value={paste}
              placeholder={PLACEHOLDER}
              aria-describedby="paste-help"
              onChange={(e) => setPaste(e.target.value)}
            />
            <span id="paste-help" className="text-sm leading-snug text-ink-muted">
              Copy the table from the Klaviyo Partner Portal and paste it here, with or without the header. Paste the full export every time:
              lines already in the ledger are skipped.
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={addData} disabled={disabled}>
              {saving ? "Adding…" : "Add to ledger"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPaste("");
                setMsg(null);
              }}
            >
              Clear box
            </Button>
          </div>
          {msg && (
            <div
              role="status"
              className={cn(
                "w-fit max-w-full rounded-control px-4 py-3 text-sm font-medium",
                msg.ok ? "bg-success-50 text-success" : "bg-danger-50 text-danger"
              )}
            >
              {msg.text}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-panel bg-navy-50 p-6">
            <div className="text-lg font-semibold text-navy">Backup file</div>
            <p className="text-sm leading-normal text-ink-muted">
              The ledger is saved in the database. Download a backup after each quarter; opening a backup file replaces the ledger with its
              content. The file includes your answers and notes, and files saved from the earlier browser-only ledger open here too.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" asChild>
                <a href="/api/ledger/export" download>
                  Download backup
                  <Download aria-hidden />
                </a>
              </Button>
              <Button size="sm" variant="outline" disabled={disabled} onClick={() => fileRef.current?.click()}>
                Open backup file
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
          </div>

          <div className="flex flex-col gap-3 px-1">
            {!confirming ? (
              <div>
                <Button variant="link" disabled={model.empty} onClick={() => setConfirming(true)}>
                  Delete all data
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-control bg-danger-50 p-4">
                <span className="text-sm font-semibold text-danger">
                  Delete all {model.lines.length.toLocaleString("en-US")} lines and your answers? Download a backup first if you may need
                  them.
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" variant="destructive" disabled={disabled} onClick={wipe}>
                    Delete everything
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
                    Keep
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {lp && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h3 className="m-0 text-lg font-semibold text-ink">New in the last paste</h3>
            <span className="text-sm text-ink-muted">
              {fdt(lp.at)} · {lp.added} added, {lp.dup} skipped
            </span>
            {lp.added > 0 && newLines.length > 0 && (
              <Link href="/?show=new" className="text-sm font-semibold">
                See them in Quarters
              </Link>
            )}
          </div>
          {!lp.added || !newLines.length ? (
            <p className="text-sm text-ink-muted">No new lines: everything in that paste was already in the ledger.</p>
          ) : (
            <div className="overflow-x-auto rounded-card border border-rule">
              <div className="min-w-[820px] text-sm">
                <div className={cn(GRID, "bg-navy-50 px-5 py-3 text-[13px] font-semibold text-ink-muted")}>
                  <span>Quarter</span>
                  <span>Customer</span>
                  <span>Product</span>
                  <span className="text-right">Rate</span>
                  <span>Paid on</span>
                  <span className="text-right">Customer paid ($)</span>
                  <span className="text-right">Payout ($)</span>
                </div>
                {newLines.map((n, i) => {
                  const q = qOf(n.paid_on);
                  return (
                    <div key={i} className={cn(GRID, "border-t border-rule px-5 py-2.5")}>
                      <span>
                        {q.y}-Q{q.q}
                      </span>
                      <span className="font-semibold [overflow-wrap:anywhere]">{n.customer}</span>
                      <span>{n.product}</span>
                      <span className="text-right">{pct(n.rate)}</span>
                      <span>{fdate(n.paid_on)}</span>
                      <span className="text-right">{money(n.amount)}</span>
                      <span className="text-right font-semibold text-navy">{money(n.payout)}</span>
                    </div>
                  );
                })}
                <div className={cn(GRID, "bg-navy-900 px-5 py-3 font-semibold text-on-navy")}>
                  <span className="col-span-5">
                    {newLines.length} new line{newLines.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-right">{money(newLines.reduce((a, r) => a + r.amount, 0))}</span>
                  <span className="text-right">{money(newLines.reduce((a, r) => a + r.payout, 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {model.pastes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-lg font-semibold text-ink">Paste history</h3>
          <div className="flex w-fit max-w-full flex-col overflow-x-auto text-sm">
            {model.pastes.map((h, i) => (
              <div key={i} className="grid min-w-[560px] grid-cols-[200px_120px_120px_120px] gap-x-4 border-b border-rule py-2">
                <span>{fdt(h.at)}</span>
                <span>{h.added} added</span>
                <span className="text-ink-muted">{h.dup} skipped</span>
                <span className="text-ink-muted">{h.bad ? `${h.bad} unreadable` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
