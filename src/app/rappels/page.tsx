import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import RappelsClient from "./RappelsClient";

export default async function RappelsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: reminders } = await supabase
    .from("medication_reminders")
    .select("*")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Rappels médicaments" back gradient="from-indigo-600 to-purple-700" emoji="⏰" />
      <div className="px-4 pt-3">
        <Link href="/rappels/sms"
          className="flex items-center gap-3 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-teal-50 px-4 py-3 mb-1 active:opacity-80">
          <span className="text-2xl">💬</span>
          <div>
            <p className="font-semibold text-green-800 text-sm">Rappels SMS / WhatsApp</p>
            <p className="text-xs text-green-600">Notifications automatiques sur votre mobile</p>
          </div>
          <span className="ml-auto text-green-500">→</span>
        </Link>
      </div>
      <RappelsClient personId={person.id} initialData={reminders ?? []} />
    </div>
  );
}
