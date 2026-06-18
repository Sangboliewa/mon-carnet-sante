import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import SanteDashboardClient from "./SanteDashboardClient";
import type { VitalMeasurement } from "@/lib/supabase/types";

export default async function SantePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/dashboard");

  // Fetch last 90 days of measurements
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const { data: measurements } = await supabase
    .from("vital_measurements")
    .select("*")
    .eq("person_id", person.id)
    .gte("measured_at", since)
    .order("measured_at", { ascending: true });

  const { data: labResults } = await supabase
    .from("lab_results")
    .select("test_name, value, unit, ref_min, ref_max, test_date, category")
    .eq("person_id", person.id)
    .order("test_date", { ascending: false })
    .limit(20);

  const { data: malaria } = await supabase
    .from("malaria_episodes")
    .select("episode_date, severity, outcome")
    .eq("person_id", person.id)
    .order("episode_date", { ascending: false })
    .limit(5);

  return (
    <div>
      <PageHeader
        title="Tableau de Bord Santé"
        subtitle={`${person.first_name} ${person.last_name}`}
        back
      />
      <SanteDashboardClient
        person={person}
        measurements={(measurements ?? []) as VitalMeasurement[]}
        labResults={labResults ?? []}
        malaria={malaria ?? []}
      />
    </div>
  );
}
