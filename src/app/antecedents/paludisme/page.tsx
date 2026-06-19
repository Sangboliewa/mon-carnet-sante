import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import PaludismeClient from "./PaludismeClient";

export default async function PaludismePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: episodes } = await supabase
    .from("malaria_episodes")
    .select("*")
    .eq("person_id", person.id)
    .order("episode_date", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Suivi Paludisme"
        subtitle={`${person.first_name} ${person.last_name}`}
        gradient="from-orange-500 to-amber-600"
        emoji="🦟"
        back
      />
      <PaludismeClient personId={person.id} initialData={episodes ?? []} />
    </div>
  );
}
