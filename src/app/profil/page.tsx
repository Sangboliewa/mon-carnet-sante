import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import ProfilForm from "./ProfilForm";
import CreateProfilForm from "./CreateProfilForm";

export default async function ProfilPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);

  return (
    <div>
      <PageHeader
        title={person ? "Mon Profil" : "Créer mon profil"}
        subtitle={person ? "Informations personnelles de santé" : "Première connexion"}
        back
      />
      <div className="px-4 py-5">
        {person ? <ProfilForm person={person} /> : <CreateProfilForm />}
      </div>
    </div>
  );
}
