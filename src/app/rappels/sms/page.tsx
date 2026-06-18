import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import Link from "next/link";
import SmsRappelsClient from "./SmsRappelsClient";

export default async function SmsRappelsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: reminders } = await supabase
    .from("sms_reminders")
    .select("*")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });

  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );

  return (
    <div>
      <div className="bg-gradient-to-br from-green-600 to-teal-700 px-4 pt-12 pb-8">
        <Link href="/rappels" className="text-green-100 text-sm mb-3 block">← Rappels médicaments</Link>
        <h1 className="text-white text-2xl font-bold">📱 Rappels SMS / WhatsApp</h1>
        <p className="text-green-100 text-sm mt-1">{person.first_name} {person.last_name}</p>
      </div>
      <SmsRappelsClient
        personId={person.id}
        initial={(reminders ?? []) as Parameters<typeof SmsRappelsClient>[0]["initial"]}
        twilioConfigured={twilioConfigured}
      />
    </div>
  );
}
