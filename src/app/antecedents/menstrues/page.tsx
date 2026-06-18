import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import MenstruesClient from "./MenstruesClient";

export default async function MenstruesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  if (person.gender !== "female") redirect("/antecedents");

  const { data: cycles } = await supabase
    .from("menstrual_cycles")
    .select("*")
    .eq("person_id", person.id)
    .order("start_date", { ascending: false });

  return (
    <div>
      <PageHeader title="Suivi des menstrues" back />
      <MenstruesClient personId={person.id} initialData={cycles ?? []} />
    </div>
  );
}
