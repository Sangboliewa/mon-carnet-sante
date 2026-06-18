import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import DocumentDetailClient from "./DocumentDetailClient";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  // Verify the document belongs to a person this user has access to
  const { data: doc } = await supabase
    .from("medical_documents")
    .select("*")
    .eq("id", id)
    .eq("person_id", person.id)
    .single();

  if (!doc) notFound();

  // Glossary lookup by exam_type — no LLM (chemin 3)
  const { data: glossary } = doc.exam_type
    ? await supabase
        .from("exam_glossary")
        .select("*")
        .eq("exam_type", doc.exam_type)
        .single()
    : { data: null };

  return (
    <div>
      <PageHeader title={doc.filename} back />
      <DocumentDetailClient
        document={doc}
        userId={user.id}
        glossary={glossary}
      />
    </div>
  );
}
