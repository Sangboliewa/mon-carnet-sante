import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import ParametresClient from "./ParametresClient";

const APP_VERSION = "2.5.0";

export default async function ParametresPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const person = await getCurrentPerson(supabase, user.id, null);

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div>
      {/* Header */}
      <div className="bg-health-blue px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/80 text-sm">←</Link>
          <h1 className="text-white text-xl font-bold">Paramètres</h1>
        </div>
      </div>

      <ParametresClient
        userId={user.id}
        email={user.email ?? ""}
        firstName={person?.first_name ?? user.email?.split("@")[0] ?? ""}
        lastName={person?.last_name ?? null}
        prefs={prefs ?? null}
        appVersion={APP_VERSION}
      />
    </div>
  );
}
