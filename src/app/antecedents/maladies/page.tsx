import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import MaladiesClient from "./MaladiesClient";

export default async function MaladiesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: conditions } = await supabase
    .from("chronic_conditions")
    .select("*")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Maladies chroniques" back gradient="from-purple-600 to-indigo-700" emoji="🫀" />
      <MaladiesClient personId={person.id} initialData={conditions ?? []} />
    </div>
  );
}
