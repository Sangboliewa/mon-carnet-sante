import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import AgendaClient from "./AgendaClient";

export default async function AgendaPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("person_id", person.id)
    .order("appointment_date", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Agenda santé"
        subtitle={`${person.first_name} ${person.last_name}`}
        gradient="from-teal-600 to-cyan-700"
        emoji="📅"
        back
      />
      <AgendaClient personId={person.id} initialData={appointments ?? []} />
    </div>
  );
}
