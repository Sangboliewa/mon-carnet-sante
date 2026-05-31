import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import VaccinsClient from "./VaccinsClient";

export default async function VaccinsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/dashboard");

  const { data: vaccinations } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("person_id", person.id)
    .order("administered_date", { ascending: false });

  return (
    <div>
      <PageHeader title="Vaccinations" back />
      <VaccinsClient personId={person.id} initialData={vaccinations ?? []} />
    </div>
  );
}
