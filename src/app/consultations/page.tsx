import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import ConsultationsClient from "./ConsultationsClient";

export default async function ConsultationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: consultations } = await supabase
    .from("medical_consultations")
    .select("*")
    .eq("person_id", person.id)
    .order("consultation_date", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Consultations"
        subtitle={`${person.first_name} ${person.last_name}`}
      />
      <ConsultationsClient personId={person.id} initialData={consultations ?? []} />
    </div>
  );
}
