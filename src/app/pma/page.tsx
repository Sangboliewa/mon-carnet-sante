import { redirect } from "next/navigation";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PMAClient from "./PMAClient";

export default async function PMAPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: attempts } = await supabase
    .from("pma_attempts")
    .select("*")
    .eq("person_id", person.id)
    .order("attempt_number", { ascending: false });

  return (
    <Suspense fallback={null}>
      <PMAClient
        personId={person.id}
        personName={`${person.first_name} ${person.last_name ?? ""}`.trim()}
        initialAttempts={attempts ?? []}
      />
    </Suspense>
  );
}
