import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import ProfilForm from "./ProfilForm";
import CreateProfilForm from "./CreateProfilForm";
import HealthIdCard from "@/components/HealthIdCard";
import PageHeader from "@/components/PageHeader";

export default async function ProfilPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);

  if (!person) {
    return (
      <div>
        <PageHeader
          title="Créer mon profil"
          subtitle="Première connexion"
          gradient="from-health-blue to-indigo-700"
          emoji="👤"
          back
        />
        <div className="px-4 py-5">
          <CreateProfilForm />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-10 pb-5 bg-gradient-to-br from-health-blue to-indigo-700">
        <p className="text-blue-200 text-sm mb-1">Mon profil santé</p>
        <h1 className="text-white text-2xl font-bold">{person.first_name} {person.last_name ?? ""}</h1>
        <p className="text-blue-200 text-xs mt-1">{user.email}</p>
      </div>

      <div className="px-4 py-5 space-y-5 animate-slide-up">
        {/* Carte d'identité médicale */}
        <HealthIdCard person={person} />

        {/* Formulaire modification */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Modifier mes informations</p>
          <ProfilForm person={person} />
        </div>
      </div>
    </div>
  );
}
