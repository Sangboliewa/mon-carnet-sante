import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import Link from "next/link";
import CalendrierClient from "./CalendrierClient";

export default async function CalendrierVaccinationPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: vaccinations } = await supabase
    .from("vaccinations")
    .select("vaccine_name")
    .eq("person_id", person.id);

  // Calcul âge en mois
  let ageMonths = 0;
  if (person.date_of_birth) {
    const dob = new Date(person.date_of_birth);
    const now = new Date();
    ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  }

  const receivedNames = (vaccinations ?? []).map(v => v.vaccine_name);

  return (
    <div>
      <div className="bg-gradient-to-br from-green-600 to-teal-700 px-4 pt-12 pb-8">
        <Link href="/antecedents/vaccins" className="text-green-100 text-sm mb-3 block">← Vaccinations</Link>
        <h1 className="text-white text-2xl font-bold">📅 Calendrier vaccinal</h1>
        <p className="text-green-100 text-sm mt-1">{person.first_name} {person.last_name}</p>
        {person.date_of_birth && (
          <p className="text-green-200 text-xs mt-1">
            {Math.floor(ageMonths / 12)} ans {ageMonths % 12 > 0 ? `${ageMonths % 12} mois` : ""}
          </p>
        )}
      </div>
      <CalendrierClient
        receivedNames={receivedNames}
        ageMonths={ageMonths}
        personFirstName={person.first_name ?? ""}
      />
    </div>
  );
}
