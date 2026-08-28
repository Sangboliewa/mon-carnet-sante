import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import SommeilClient from "./SommeilClient";

export default async function SommeilPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const person = await getCurrentPerson(supabase, user.id, null);
  if (!person) redirect("/profil");

  return (
    <div>
      <div className="bg-gradient-to-br from-indigo-600 to-purple-800 px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/80 text-sm">←</Link>
          <div>
            <h1 className="text-white text-xl font-bold">😴 Suivi sommeil</h1>
            <p className="text-indigo-200 text-xs">{person.first_name}</p>
          </div>
        </div>
      </div>
      <SommeilClient personId={person.id} />
    </div>
  );
}
