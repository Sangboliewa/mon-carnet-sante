import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";

interface Section {
  href: string;
  icon: string;
  label: string;
  sublabel: string;
  count: number;
  accent: string;
  accentBg: string;
  tip: string;
}

export default async function AntecedentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const [
    { count: allergiesCount },
    { count: maladiesCount },
    { count: traitementsCount },
    { count: vaccinsCount },
    { count: mesuresCount },
    { count: paludismeCount },
    { count: menstruesCount },
    { count: grossesseCount },
  ] = await Promise.all([
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
  ]);

  const isFemale = person.gender === "female";

  const SECTIONS: Section[] = [
    {
      href: "/antecedents/allergies",
      icon: "⚠️", label: "Allergies",
      sublabel: "Médicaments, aliments, environnement",
      count: allergiesCount ?? 0,
      accent: "text-red-600", accentBg: "bg-red-50 border-red-200",
      tip: "Infos affichées sur ta carte d'urgence",
    },
    {
      href: "/antecedents/chroniques",
      icon: "🫀", label: "Maladies chroniques",
      sublabel: "Diabète, HTA, drépanocytose…",
      count: maladiesCount ?? 0,
      accent: "text-purple-600", accentBg: "bg-purple-50 border-purple-200",
      tip: "Modules spécialisés avec suivi dédié",
    },
    {
      href: "/antecedents/traitements",
      icon: "💊", label: "Traitements",
      sublabel: "Médicaments en cours ou passés",
      count: traitementsCount ?? 0,
      accent: "text-blue-600", accentBg: "bg-blue-50 border-blue-200",
      tip: "Visible par By' pour ses réponses",
    },
    {
      href: "/antecedents/vaccins",
      icon: "💉", label: "Vaccinations",
      sublabel: "Carnet vaccinal & rappels",
      count: vaccinsCount ?? 0,
      accent: "text-green-600", accentBg: "bg-green-50 border-green-200",
      tip: "Rappels automatiques avant chaque date",
    },
    {
      href: "/antecedents/mesures",
      icon: "📊", label: "Mesures vitales",
      sublabel: "Tension, poids, glycémie…",
      count: mesuresCount ?? 0,
      accent: "text-cyan-600", accentBg: "bg-cyan-50 border-cyan-200",
      tip: "Graphiques d'évolution dans Bilan santé",
    },
    {
      href: "/antecedents/paludisme",
      icon: "🦟", label: "Suivi Paludisme",
      sublabel: "Épisodes, tests, traitements",
      count: paludismeCount ?? 0,
      accent: "text-orange-600", accentBg: "bg-orange-50 border-orange-200",
      tip: "Adapté aux zones endémiques d'Afrique",
    },
  ];

  if (isFemale) {
    SECTIONS.push(
      {
        href: "/antecedents/menstrues",
        icon: "🌸", label: "Cycle menstruel",
        sublabel: "Suivi de tes cycles",
        count: menstruesCount ?? 0,
        accent: "text-pink-600", accentBg: "bg-pink-50 border-pink-200",
        tip: "Prédiction de la prochaine date",
      },
      {
        href: "/antecedents/grossesse",
        icon: "🤰", label: "Grossesse",
        sublabel: "Consultations prénatales",
        count: grossesseCount ?? 0,
        accent: "text-rose-600", accentBg: "bg-rose-50 border-rose-200",
        tip: "Suivi des RDV et de l'évolution",
      }
    );
  }

  const filled = SECTIONS.filter(s => s.count > 0).length;
  const total = SECTIONS.length;
  const pct = Math.round((filled / total) * 100);

  return (
    <div>
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-health-blue to-indigo-700 px-4 pt-10 pb-6">
        <p className="text-blue-200 text-sm mb-1">Dossier médical de</p>
        <h1 className="text-white text-2xl font-bold">{person.first_name} {person.last_name ?? ""}</h1>

        {/* Barre de complétude */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-blue-100 text-xs font-medium">Complétude du dossier</span>
            <span className="text-white text-xs font-bold">{filled}/{total} sections</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-blue-200 text-xs mt-1.5">
            {pct === 100
              ? "🎉 Dossier complet — excellent travail !"
              : pct >= 50
              ? `${100 - pct}% restant — continue à compléter ton dossier`
              : "Commence par renseigner tes informations essentielles"}
          </p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3 animate-slide-up">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-center gap-3 rounded-2xl border p-4 active:scale-[0.98] transition-transform ${s.accentBg}`}
          >
            <span className="text-3xl shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.sublabel}</p>
              <p className="text-xs text-gray-400 mt-0.5 italic">{s.tip}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              {s.count > 0 ? (
                <span className={`text-xs font-bold ${s.accent} bg-white rounded-full px-2 py-0.5 border`}>
                  {s.count}
                </span>
              ) : (
                <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5 border border-gray-200">
                  Vide
                </span>
              )}
              <span className="text-gray-300 text-lg">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
