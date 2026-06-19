import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import SyncMontreClient from "./SyncMontreClient";

export default async function SyncMontrePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const person = await getCurrentPerson(supabase, user.id, null);
  if (!person) redirect("/profil");

  return (
    <div>
      <div className="bg-gradient-to-br from-purple-700 to-indigo-700 px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/80 text-sm">â†</Link>
          <div>
            <h1 className="text-white text-xl font-bold">Montre & SantÃ© connectÃ©e</h1>
            <p className="text-purple-200 text-xs">Synchroniser vos donnÃ©es depuis vos appareils</p>
          </div>
        </div>
      </div>
      <SyncMontreClient personId={person.id} personName={person.first_name} />
    </div>
  );
}

