import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllPersons } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import FamilleClient from "./FamilleClient";

export default async function FamillePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const persons = await getAllPersons(supabase, user.id);
  const cookieStore = await cookies();
  const activePersonId = cookieStore.get("active_person_id")?.value ?? persons[0]?.id ?? "";

  return (
    <div>
      <PageHeader title="Famille" subtitle="Gérer les profils" back />
      <FamilleClient userId={user.id} persons={persons} activePersonId={activePersonId} />
    </div>
  );
}

