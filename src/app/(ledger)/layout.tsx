import { loadLedger } from "@/lib/ledger/store";
import { LedgerProvider } from "@/components/ledger/ledger-provider";
import { AppHeader, ViewTabs } from "@/components/ledger/app-header";

export const dynamic = "force-dynamic";

export default async function LedgerLayout({ children }: { children: React.ReactNode }) {
  const data = await loadLedger();
  return (
    <LedgerProvider data={data}>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 pt-8 pb-24 tabular-nums sm:px-8">
        <AppHeader />
        <ViewTabs />
        <main className="flex flex-col">{children}</main>
      </div>
    </LedgerProvider>
  );
}
