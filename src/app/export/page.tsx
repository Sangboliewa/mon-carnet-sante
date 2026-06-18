import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import ExportClient from "./ExportClient";

export default async function ExportPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const today = new Date().toISOString().split("T")[0];

  const [
    { data: allergies },
    { data: conditions },
    { data: treatments },
    { data: vaccinations },
    { data: consultations },
    { data: labResults },
  ] = await Promise.all([
    supabase.from("allergies").select("allergen, severity, reaction, diagnosed_date").eq("person_id", person.id),
    supabase.from("chronic_conditions").select("condition_name, status, diagnosed_date").eq("person_id", person.id),
    supabase.from("treatments").select("medication_name, dosage, frequency, start_date, end_date, prescribing_doctor").eq("person_id", person.id).or(`end_date.is.null,end_date.gte.${today}`),
    supabase.from("vaccinations").select("vaccine_name, administered_date, next_dose_date").eq("person_id", person.id).order("administered_date", { ascending: false }),
    supabase.from("medical_consultations").select("consultation_date, doctor_name, specialty, reason, diagnosis, prescription_text").eq("person_id", person.id).order("consultation_date", { ascending: false }).limit(10),
    supabase.from("lab_results").select("test_date, test_name, value, unit, ref_min, ref_max").eq("person_id", person.id).order("test_date", { ascending: false }).limit(20),
  ]);

  return (
    <ExportClient
      person={person}
      allergies={allergies ?? []}
      conditions={conditions ?? []}
      treatments={treatments ?? []}
      vaccinations={vaccinations ?? []}
      consultations={consultations ?? []}
      labResults={labResults ?? []}
      exportDate={today}
    />
  );
}
