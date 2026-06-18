import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import ActiviteClient from "./ActiviteClient";

export default async function ActivitePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const person = await getCurrentPerson(supabase, user.id, null);
  if (!person) redirect("/dashboard");

  return (
    <div>
      <div className="bg-health-blue px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/80 text-sm">←</Link>
          <div>
            <h1 className="text-white text-xl font-bold">Activité physique</h1>
            <p className="text-blue-200 text-xs">{person.first_name}</p>
          </div>
        </div>
      </div>
      <ActiviteClient
        personId={person.id}
        heightCm={person.height_cm ?? null}
        weightKg={person.weight_kg ?? null}
      />
    </div>
  );
}
