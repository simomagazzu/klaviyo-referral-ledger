import { Suspense } from "react";
import { QuartersView } from "@/components/ledger/quarters-view";

export default function QuartersPage() {
  return (
    <Suspense>
      <QuartersView />
    </Suspense>
  );
}
