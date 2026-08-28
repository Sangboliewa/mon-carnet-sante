import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PMADetailClient from "./PMADetailClient";

export default async function PMADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const [{ data: attempt }, { data: logs }] = await Promise.all([
    supabase.from("pma_attempts").select("*").eq("id", id).eq("person_id", person.id).single(),
    supabase.from("pma_cycle_logs").select("*").eq("attempt_id", id).order("log_date"),
  ]);

  if (!attempt) notFound();

  return (
    <Suspense fallback={null}>
      <PMADetailClient attempt={attempt} initialLogs={logs ?? []} />
    </Suspense>
  );
}
