import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import SymptomesClient from "./SymptomesClient";

export default async function SymptomesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: logs } = await supabase
    .from("symptom_logs")
    .select("*")
    .eq("person_id", person.id)
    .order("logged_date", { ascending: false })
    .limit(90);

  return (
    <div>
      <PageHeader title="Journal des symptômes" back gradient="from-teal-500 to-green-700" emoji="📝" />
      <SymptomesClient personId={person.id} initialData={logs ?? []} />
    </div>
  );
}
