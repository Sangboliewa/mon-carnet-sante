import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import AllergiesClient from "./AllergiesClient";

export default async function AllergiesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/dashboard");

  const { data: allergies } = await supabase
    .from("allergies")
    .select("*")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Allergies" back />
      <AllergiesClient personId={person.id} initialData={allergies ?? []} />
    </div>
  );
}
