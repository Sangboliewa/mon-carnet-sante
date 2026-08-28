import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import EspaceMedecinClient from "./EspaceMedecinClient";

export default async function EspaceMedecinPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("doctor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return (
      <Suspense fallback={null}>
        <EspaceMedecinClient userId={user.id} hasProfile={false} profile={null} patients={[]} pendingLinks={[]} />
      </Suspense>
    );
  }

  const { data: acceptedLinks } = await supabase
    .from("doctor_patient_links")
    .select("id, person_id, created_at, persons(id, first_name, last_name)")
    .eq("doctor_id", profile.id)
    .eq("status", "accepted");

  const { data: pendingLinks } = await supabase
    .from("doctor_patient_links")
    .select("id, person_id, created_at, persons(id, first_name, last_name)")
    .eq("doctor_id", profile.id)
    .eq("status", "pending");

  const patients = (acceptedLinks ?? []).map((link: any) => ({
    linkId: link.id as string,
    personId: link.person_id as string,
    firstName: (link.persons as any)?.first_name ?? "",
    lastName: (link.persons as any)?.last_name ?? "",
    createdAt: link.created_at as string,
  }));

  const pending = (pendingLinks ?? []).map((link: any) => ({
    linkId: link.id as string,
    personId: link.person_id as string,
    firstName: (link.persons as any)?.first_name ?? "",
    lastName: (link.persons as any)?.last_name ?? "",
    createdAt: link.created_at as string,
  }));

  return (
    <Suspense fallback={null}>
      <EspaceMedecinClient
        userId={user.id}
        hasProfile={true}
        profile={profile}
        patients={patients}
        pendingLinks={pending}
      />
    </Suspense>
  );
}
