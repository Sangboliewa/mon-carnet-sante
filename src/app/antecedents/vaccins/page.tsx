import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import VaccinsClient from "./VaccinsClient";

export default async function VaccinsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: vaccinations } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("person_id", person.id)
    .order("administered_date", { ascending: false });

  return (
    <div>
      <PageHeader title="Vaccinations" back gradient="from-green-500 to-teal-600" emoji="💉" />
      <div className="px-4 pt-3">
        <Link href="/antecedents/vaccins/calendrier"
          className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 mb-1 active:opacity-80">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-green-800 text-sm">Calendrier vaccinal multi-pays</p>
            <p className="text-xs text-green-600">12 pays · PEV OMS · Vaccins manquants</p>
          </div>
          <span className="ml-auto text-green-500">→</span>
        </Link>
      </div>
      <VaccinsClient personId={person.id} initialData={vaccinations ?? []} />
    </div>
  );
}
