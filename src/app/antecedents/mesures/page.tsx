import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import MesuresClient from "./MesuresClient";

export default async function MesuresPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: measurements } = await supabase
    .from("vital_measurements")
    .select("*")
    .eq("person_id", person.id)
    .order("measured_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Mesures vitales" back gradient="from-cyan-500 to-blue-600" emoji="📊" />
      <MesuresClient personId={person.id} initialData={measurements ?? []} heightCm={person.height_cm} />
    </div>
  );
}
