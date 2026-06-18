import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import PediatriqueClient from "./PediatriqueClient";

export default async function PediatriquePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const ageMonths = person.date_of_birth
    ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (30.44 * 24 * 3600 * 1000))
    : 0;

  const { data: records } = await supabase
    .from("growth_records")
    .select("*")
    .eq("person_id", person.id)
    .order("recorded_date", { ascending: false });

  return (
    <div>
      <PageHeader title="Suivi pédiatrique" subtitle={`${person.first_name} ${person.last_name}`} back />
      <PediatriqueClient personId={person.id} ageMonths={ageMonths} initialData={records ?? []} />
    </div>
  );
}
