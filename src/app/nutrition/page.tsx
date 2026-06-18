import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";
import NutritionClient from "./NutritionClient";

export const metadata: Metadata = {
  title: "Nutrition | Mon Carnet Santé",
};

export default async function NutritionPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);

  if (!person) redirect("/dashboard");

  return (
    <div>
      <PageHeader title="Nutrition" subtitle={`Journal de ${person.first_name}`} back />
      <NutritionClient personId={person.id} />
    </div>
  );
}
