import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import AssistantClient from "./AssistantClient";

export default async function AssistantPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-white/80 text-2xl leading-none">‹</Link>
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">A</div>
        <div>
          <p className="text-white font-semibold leading-tight">ABIBA</p>
          <p className="text-blue-200 text-xs">Assistante Santé IA · en ligne</p>
        </div>
      </div>

      <AssistantClient
        personId={person.id}
        personName={person.first_name}
      />
    </div>
  );
}
