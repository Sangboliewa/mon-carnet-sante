import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import ProfilForm from "./ProfilForm";

export default async function ProfilPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);

  return (
    <div>
      <PageHeader title="Mon Profil" subtitle="Informations personnelles de santé" />
      <div className="px-4 py-5">
        {person ? (
          <ProfilForm person={person} />
        ) : (
          <div className="card text-center text-gray-500 py-8">
            <p>Aucun profil trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
}
