import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: documents } = await supabase
    .from("medical_documents")
    .select("*")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Coffre-fort" subtitle="Vos documents médicaux" gradient="from-gray-700 to-gray-900" emoji="📁" back />
      <DocumentsClient personId={person.id} userId={user.id} initialData={documents ?? []} />
    </div>
  );
}
