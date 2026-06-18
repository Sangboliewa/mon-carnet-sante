import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import GrossesseClient from "./GrossesseClient";

export default async function GrossessePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");
  if (person.gender !== "female") redirect("/antecedents");

  const { data: pregnancies } = await supabase
    .from("pregnancies")
    .select("*")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const currentPregnancy = pregnancies?.[0] ?? null;

  const { data: appointments } = await supabase
    .from("prenatal_appointments")
    .select("*")
    .eq("person_id", person.id)
    .order("appointment_date", { ascending: true });

  return (
    <div>
      <PageHeader title="Suivi de grossesse" back />
      <GrossesseClient
        personId={person.id}
        initialPregnancy={currentPregnancy}
        initialAppointments={appointments ?? []}
      />
    </div>
  );
}
