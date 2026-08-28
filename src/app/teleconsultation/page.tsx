import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import TeleconsultationClient from "./TeleconsultationClient";

export const metadata: Metadata = {
  title: "Téléconsultation | Mon Carnet Santé",
};

export default async function TeleconsultationPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader title="Téléconsultations" subtitle="Consultations médicales en ligne" back />
      <TeleconsultationClient />
    </div>
  );
}

