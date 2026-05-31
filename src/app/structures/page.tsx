import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import StructuresClient from "./StructuresClient";

export default function StructuresPage() {
  return (
    <AppShell>
      <PageHeader title="Structures de santé" back />
      <StructuresClient />
    </AppShell>
  );
}
