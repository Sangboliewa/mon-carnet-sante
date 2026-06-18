import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import Link from "next/link";
import DiabeteClient from "./DiabeteClient";

export default async function DiabetePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: records } = await supabase
    .from("diabetes_records")
    .select("*")
    .eq("person_id", person.id)
    .order("recorded_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-4 pt-12 pb-8">
        <Link href="/antecedents/chroniques" className="text-amber-100 text-sm mb-3 block">← Maladies chroniques</Link>
        <h1 className="text-white text-2xl font-bold">🩸 Suivi Diabète</h1>
        <p className="text-amber-100 text-sm mt-1">{person.first_name} {person.last_name}</p>
      </div>
      <DiabeteClient personId={person.id} initial={(records ?? []) as Parameters<typeof DiabeteClient>[0]["initial"]} />
    </div>
  );
}
