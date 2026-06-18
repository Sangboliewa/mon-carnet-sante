import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import Link from "next/link";

export default async function ChroniquesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const [
    { count: diabeteCount },
    { count: htaCount },
    { count: drepaCount },
  ] = await Promise.all([
    supabase.from("diabetes_records").select("id", { count: "exact", head: true }).eq("person_id", person.id),
    supabase.from("hta_records").select("id", { count: "exact", head: true }).eq("person_id", person.id),
    supabase.from("drepanocytose_records").select("id", { count: "exact", head: true }).eq("person_id", person.id),
  ]);

  const sections = [
    {
      href: "/antecedents/chroniques/diabete",
      icon: "🩸",
      label: "Diabète",
      sub: "Glycémie, HbA1c, insuline",
      count: diabeteCount ?? 0,
      color: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
    },
    {
      href: "/antecedents/chroniques/hta",
      icon: "🩺",
      label: "Hypertension (HTA)",
      sub: "Tension artérielle, suivi",
      count: htaCount ?? 0,
      color: "border-red-200 bg-red-50",
      badge: "bg-red-100 text-red-700",
    },
    {
      href: "/antecedents/chroniques/drepanocytose",
      icon: "🧬",
      label: "Drépanocytose",
      sub: "Crises, transfusions, hémoglobine",
      count: drepaCount ?? 0,
      color: "border-purple-200 bg-purple-50",
      badge: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 px-4 pt-12 pb-8">
        <Link href="/antecedents" className="text-teal-200 text-sm mb-3 block">← Antécédents</Link>
        <h1 className="text-white text-2xl font-bold">Maladies chroniques</h1>
        <p className="text-teal-100 text-sm mt-1">{person.first_name} {person.last_name}</p>
      </div>

      <div className="px-4 py-5 space-y-3">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className={`flex items-center gap-4 rounded-2xl border p-4 ${s.color} active:opacity-80`}>
            <span className="text-3xl">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
            </div>
            {s.count > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
                {s.count}
              </span>
            )}
            <span className="text-gray-400">→</span>
          </Link>
        ))}

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-1">💡 À savoir</p>
          <p className="text-sm text-blue-800">
            En Afrique subsaharienne, le diabète, l'hypertension et la drépanocytose figurent parmi
            les maladies chroniques les plus répandues. Un suivi régulier permet de prévenir les complications.
          </p>
        </div>
      </div>
    </div>
  );
}
