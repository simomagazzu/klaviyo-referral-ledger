import { ClientDetailView } from "@/components/ledger/client-detail-view";

export default async function ClientPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <ClientDetailView name={decodeURIComponent(name)} />;
}
