"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { fdate } from "@/lib/ledger/core";
import { cn } from "@/lib/utils";
import { useLedger } from "./ledger-provider";

export function AppHeader() {
  const { model } = useLedger();
  const freshness = model.empty
    ? "No data yet"
    : `Payments through ${fdate(model.last)} · ${model.lines.length.toLocaleString("en-US")} lines`;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-5">
        <Link href="/" aria-label="Quarters" className="rounded-tag">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-loop-color.svg" alt="Loop srl" className="block h-7 w-auto" />
        </Link>
        <span className="h-7 w-px bg-rule" aria-hidden />
        <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em] text-navy">Klaviyo referral ledger</h1>
      </div>
      <span className="text-sm text-ink-muted">{freshness}</span>
    </header>
  );
}

export function ViewTabs() {
  const path = usePathname();
  const { model } = useLedger();
  const n = model.checks.length;
  const tabs = [
    { href: "/", label: "Quarters", on: path === "/" },
    { href: "/clients", label: "Clients", on: path.startsWith("/clients") },
    { href: "/check", label: n ? `To check (${n})` : "To check", on: path === "/check" },
    { href: "/data", label: "Add data", on: path === "/data" },
  ];
  return (
    <nav aria-label="Views" className="-mt-2 flex gap-6 overflow-x-auto border-b border-rule [scrollbar-width:none]">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.on ? "page" : undefined}
          className={cn(
            "relative py-3 text-base font-semibold whitespace-nowrap no-underline transition-colors",
            t.on
              ? "text-navy after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-navy"
              : "text-ink-muted hover:text-ink"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
