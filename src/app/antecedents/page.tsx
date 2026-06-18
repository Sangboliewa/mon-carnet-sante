import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";
import PageHeader from "@/components/PageHeader";

const SECTIONS = [
  { href: "/antecedents/allergies", icon: "⚠️", label: "Allergies", color: "border-red-200 bg-red-50" },
  { href: "/antecedents/chroniques", icon: "🫀", label: "Maladies chroniques", color: "border-purple-200 bg-purple-50" },
  { href: "/antecedents/traitements", icon: "💊", label: "Traitements", color: "border-blue-200 bg-blue-50" },
  { href: "/antecedents/vaccins", icon: "💉", label: "Vaccinations", color: "border-green-200 bg-green-50" },
  { href: "/antecedents/mesures", icon: "📊", label: "Mesures vitales", color: "border-cyan-200 bg-cyan-50" },
  { href: "/antecedents/paludisme", icon: "🦟", label: "Suivi Paludisme", color: "border-orange-200 bg-orange-50" },
];

const FEMALE_SECTIONS = [
  { href: "/antecedents/menstrues", icon: "🌸", label: "Suivi des menstrues", color: "border-pink-200 bg-pink-50" },
  { href: "/antecedents/grossesse", icon: "🤰", label: "Suivi de grossesse", color: "border-rose-200 bg-rose-50" },
];

export default async function AntecedentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);

  const [
    { count: allergiesCount },
    { count: maladiesCount },
    { count: traitementsCount },
    { count: vaccinsCount },
    { count: mesuresCount },
    { count: paludismeCount },
    { count: menstruesCount },
    { count: grossesseCount },
  ] = person
    ? await Promise.all([
        supabase.from("allergies").select("id", { count: "exact", head: true }).eq("person_id", person.id),
        supabase.from("chronic_conditions").select("id", { count: "exact", head: true }).eq("person_id", person.id),
        supabase.from("treatments").select("id", { count: "exact", head: true }).eq("person_id", person.id),
        supabase.from("vaccinations").select("id", { count: "exact", head: true }).eq("person_id", person.id),
        supabase.from("vital_measurements").select("id", { count: "exact", head: true }).eq("person_id", person.id),
        supabase.from("malaria_episodes").select("id", { count: "exact", head: true }).eq("person_id", person.id),
        person.gender === "female"
          ? supabase.from("menstrual_cycles").select("id", { count: "exact", head: true }).eq("person_id", person.id)
          : Promise.resolve({ count: 0 }),
        person.gender === "female"
          ? supabase.from("prenatal_appointments").select("id", { count: "exact", head: true }).eq("person_id", person.id)
          : Promise.resolve({ count: 0 }),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }];

  const counts = [allergiesCount, maladiesCount, traitementsCount, vaccinsCount, mesuresCount, paludismeCount];
  const femaleCounts = [menstruesCount, grossesseCount];
  const isFemale = person?.gender === "female";

  return (
    <div>
      <PageHeader
        title="Antécédents médicaux"
        subtitle={person ? `${person.first_name} ${person.last_name}` : ""}
      />
      <div className="px-4 py-5 space-y-3">
        {SECTIONS.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            className={`card flex items-center gap-4 border ${s.color} active:opacity-80`}
          >
            <span className="text-3xl">{s.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{s.label}</p>
              <p className="text-sm text-gray-500">{counts[i] ?? 0} enregistrement(s)</p>
            </div>
            <span className="text-gray-400">›</span>
          </Link>
        ))}
        {isFemale && FEMALE_SECTIONS.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            className={`card flex items-center gap-4 border ${s.color} active:opacity-80`}
          >
            <span className="text-3xl">{s.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{s.label}</p>
              <p className="text-sm text-gray-500">{femaleCounts[i] ?? 0} enregistrement(s)</p>
            </div>
            <span className="text-gray-400">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
