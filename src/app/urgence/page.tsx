import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import UrgenceClient from "./UrgenceClient";

export default async function UrgencePage() {
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
    { data: treatments },
    { data: conditions },
  ] = await Promise.all([
    supabase.from("allergies").select("allergen, severity").eq("person_id", person.id).in("severity", ["severe", "life_threatening"]),
    supabase.from("treatments").select("medication_name, dosage").eq("person_id", person.id).or(`end_date.is.null,end_date.gte.${today}`),
    supabase.from("chronic_conditions").select("condition_name").eq("person_id", person.id).eq("status", "active"),
  ]);

  return (
    <div>
      <PageHeader title="Carte d'urgence" subtitle="Information pour les secours" />
      <UrgenceClient
        person={person}
        allergies={allergies ?? []}
        treatments={treatments ?? []}
        conditions={conditions ?? []}
      />
    </div>
  );
}
