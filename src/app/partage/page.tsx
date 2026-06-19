import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import PartageClient from "./PartageClient";

export default async function PartagePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: documents } = await supabase
    .from("medical_documents")
    .select("id, filename, exam_type, document_type")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });

  const { data: links } = await supabase
    .from("shared_links")
    .select("*")
    .eq("person_id", person.id)
    .eq("revoked", false)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Partage temporaire" subtitle="Liens sÃ©curisÃ©s Ã  durÃ©e limitÃ©e" />
      <PartageClient
        personId={person.id}
        userId={user.id}
        documents={documents ?? []}
        initialLinks={links ?? []}
      />
    </div>
  );
}

