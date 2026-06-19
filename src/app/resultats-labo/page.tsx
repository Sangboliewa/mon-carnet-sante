import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import ResultatsLaboClient from "./ResultatsLaboClient";

export default async function ResultatsLaboPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: results } = await supabase
    .from("lab_results")
    .select("*")
    .eq("person_id", person.id)
    .order("test_date", { ascending: false });

  return (
    <div>
      <PageHeader title="Résultats de labo" back gradient="from-cyan-600 to-blue-700" emoji="🔬" />
      <ResultatsLaboClient personId={person.id} gender={person.gender} initialData={results ?? []} />
    </div>
  );
}
