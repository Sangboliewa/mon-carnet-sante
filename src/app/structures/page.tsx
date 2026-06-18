import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import StructuresClient from "./StructuresClient";

export default async function StructuresPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 px-4 pt-12 pb-8">
        <Link href="/dashboard" className="text-teal-200 text-sm mb-3 block">← Accueil</Link>
        <h1 className="text-white text-2xl font-bold">🏥 Structures de santé</h1>
        <p className="text-teal-100 text-sm mt-1">7 pays · Hôpitaux, cliniques, pharmacies</p>
      </div>
      <StructuresClient />
    </div>
  );
}
