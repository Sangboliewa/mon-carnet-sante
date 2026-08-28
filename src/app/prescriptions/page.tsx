import { redirect } from "next/navigation";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PrescriptionsClient from "./PrescriptionsClient";

export default async function PrescriptionsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("person_id", person.id)
    .order("prescription_date", { ascending: false });

  const { data: doctors } = await supabase
    .from("medical_contacts")
    .select("id, name, specialty")
    .eq("person_id", person.id)
    .order("name");

  return (
    <Suspense fallback={null}>
      <PrescriptionsClient
        personId={person.id}
        personName={`${person.first_name} ${person.last_name ?? ""}`.trim()}
        userId={user.id}
        initialPrescriptions={prescriptions ?? []}
        doctors={doctors ?? []}
      />
    </Suspense>
  );
}
