import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import Link from "next/link";
import HtaClient from "./HtaClient";

export default async function HtaPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: records } = await supabase
    .from("hta_records")
    .select("*")
    .eq("person_id", person.id)
    .order("recorded_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="bg-gradient-to-br from-red-500 to-rose-600 px-4 pt-12 pb-8">
        <Link href="/antecedents/chroniques" className="text-red-100 text-sm mb-3 block">← Maladies chroniques</Link>
        <h1 className="text-white text-2xl font-bold">🩺 Suivi HTA</h1>
        <p className="text-red-100 text-sm mt-1">{person.first_name} {person.last_name}</p>
      </div>
      <HtaClient personId={person.id} initial={(records ?? []) as Parameters<typeof HtaClient>[0]["initial"]} />
    </div>
  );
}
