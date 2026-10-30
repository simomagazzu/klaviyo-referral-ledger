"use client";

import { createContext, useCallback, useContext, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { todayISO, type AnswerStatus } from "@/lib/ledger/core";
import { buildModel, type LedgerModel } from "@/lib/ledger/model";
import type { LedgerData } from "@/lib/ledger/store";

interface NotePatch {
  status?: AnswerStatus;
  text?: string;
  resolved?: boolean;
}

interface LedgerContextValue {
  model: LedgerModel;
  today: string;
  /** true while a save is in flight or fresh data is loading */
  busy: boolean;
  saveNote: (referralId: string, patch: NotePatch) => Promise<boolean>;
  /** Call a ledger API route, then reload the data. Returns the JSON body, or null on error (already toasted). */
  mutate: <T = unknown>(url: string, init: RequestInit) => Promise<T | null>;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ data, children }: { data: LedgerData; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = todayISO();
  const model = useMemo(() => buildModel(data, today), [data, today]);

  const mutate = useCallback(
    async <T,>(url: string, init: RequestInit): Promise<T | null> => {
      try {
        const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(body.error || "Something went wrong. Try again.");
          return null;
        }
        startTransition(() => router.refresh());
        return body as T;
      } catch {
        toast.error("Could not reach the server. Check your connection and try again.");
        return null;
      }
    },
    [router]
  );

  const saveNote = useCallback(
    async (referralId: string, patch: NotePatch) =>
      (await mutate("/api/ledger/notes", { method: "POST", body: JSON.stringify({ referralId, ...patch }) })) !== null,
    [mutate]
  );

  const value = useMemo(() => ({ model, today, busy: pending, saveNote, mutate }), [model, today, pending, saveNote, mutate]);
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used inside <LedgerProvider>");
  return ctx;
}
