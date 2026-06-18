import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import Link from "next/link";
import DrepaClient from "./DrepaClient";

export default async function DrepanocytosePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: records } = await supabase
    .from("drepanocytose_records")
    .select("*")
    .eq("person_id", person.id)
    .order("recorded_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="bg-gradient-to-br from-purple-600 to-violet-700 px-4 pt-12 pb-8">
        <Link href="/antecedents/chroniques" className="text-purple-200 text-sm mb-3 block">← Maladies chroniques</Link>
        <h1 className="text-white text-2xl font-bold">🧬 Suivi Drépanocytose</h1>
        <p className="text-purple-200 text-sm mt-1">{person.first_name} {person.last_name}</p>
      </div>
      <DrepaClient personId={person.id} initial={(records ?? []) as Parameters<typeof DrepaClient>[0]["initial"]} />
    </div>
  );
}
