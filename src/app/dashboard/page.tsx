import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AllergyRow } from "@/lib/supabase/types";
import { getCurrentPerson, getAllPersons } from "@/lib/getCurrentPerson";
import LogoutButton from "./LogoutButton";
import NotificationInit from "@/components/NotificationInit";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;

  const [person, allPersons] = await Promise.all([
    getCurrentPerson(supabase, user.id, preferredId),
    getAllPersons(supabase, user.id),
  ]);

  const todayStr = new Date().toISOString().split("T")[0];
  const horizon30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [
    { data: allergies },
    { data: docs },
    { data: vaccinsRappels },
    { data: prenatalRappels },
    { data: consultRappels },
    { data: activeTraitements },
    { data: medReminders },
    { data: agendaToday },
  ] = person
    ? await Promise.all([
        supabase.from("allergies").select("allergen, severity").eq("person_id", person.id).in("severity", ["severe", "life_threatening"]).limit(3) as unknown as Promise<{ data: Pick<AllergyRow, "allergen" | "severity">[] | null }>,
        supabase.from("medical_documents").select("id").eq("person_id", person.id),
        supabase.from("vaccinations").select("vaccine_name, next_dose_date").eq("person_id", person.id).gte("next_dose_date", todayStr).lte("next_dose_date", horizon30).order("next_dose_date"),
        supabase.from("prenatal_appointments").select("appointment_type, appointment_date").eq("person_id", person.id).eq("completed", false).gte("appointment_date", todayStr).lte("appointment_date", horizon30).order("appointment_date"),
        supabase.from("medical_consultations").select("specialty, doctor_name, follow_up_date").eq("person_id", person.id).gte("follow_up_date", todayStr).lte("follow_up_date", horizon30).order("follow_up_date"),
        supabase.from("treatments").select("medication_name").eq("person_id", person.id).or(`end_date.is.null,end_date.gte.${todayStr}`).limit(5),
        supabase.from("medication_reminders").select("medication_name, dosage, reminder_times").eq("person_id", person.id).eq("active", true),
        supabase.from("appointments").select("title, appointment_time, specialty").eq("person_id", person.id).eq("completed", false).eq("appointment_date", todayStr),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }, { data: null }, { data: null }, { data: null }, { data: null }];

  const totalRappels = (vaccinsRappels?.length ?? 0) + (prenatalRappels?.length ?? 0) + (consultRappels?.length ?? 0);

  return (
    <div>
      {person && <NotificationInit personId={person.id} />}

      {/* Header */}
      <div className="bg-health-blue px-4 pt-12 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-200 text-sm">Bonjour,</p>
            <h1 className="text-white text-2xl font-bold">
              {person?.first_name ?? user.email?.split("@")[0] ?? "Utilisateur"}
            </h1>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 -mt-2">
        {/* Profil card + switcher famille */}
        {person && (
          <div className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Profil actif</p>
                <p className="font-bold text-gray-900 mt-0.5">{person.first_name} {person.last_name}</p>
                {person.blood_type && (
                  <p className="text-sm text-gray-600">
                    Groupe : <span className="font-semibold text-red-600">{person.blood_type}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Link href="/profil" className="text-health-blue text-sm font-medium bg-health-blue-light px-3 py-1 rounded-lg">Modifier</Link>
                {allPersons.length > 1 && (
                  <Link href="/famille" className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-lg">
                    👨‍👩‍👧 {allPersons.length} profils
                  </Link>
                )}
                {allPersons.length === 1 && (
                  <Link href="/famille" className="text-gray-400 text-xs">+ Famille</Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alertes allergies */}
        {allergies && allergies.length > 0 && (
          <div className="card border-red-200 bg-red-50">
            <p className="text-xs text-red-600 uppercase tracking-wide font-semibold mb-2">⚠️ Allergies graves</p>
            {allergies.map((a, i) => (
              <p key={i} className="text-sm font-medium text-red-800">
                • {a.allergen}{a.severity === "life_threatening" && " (vie en danger)"}
              </p>
            ))}
          </div>
        )}

        {/* Bloc rappels */}
        {totalRappels > 0 && (
          <div className="card border-amber-200 bg-amber-50 space-y-3">
            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">🔔 Rappels — 30 prochains jours</p>

            {(vaccinsRappels ?? []).map((v, i) => {
              const d = daysUntil(v.next_dose_date!);
              return (
                <Link key={i} href="/antecedents/vaccins" className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">💉 {v.vaccine_name}</p>
                    <p className="text-xs text-gray-500">{v.next_dose_date}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d === 0 ? "bg-red-100 text-red-700" : d <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {d === 0 ? "Aujourd'hui" : `Dans ${d}j`}
                  </span>
                </Link>
              );
            })}

            {(prenatalRappels ?? []).map((a, i) => {
              const d = daysUntil(a.appointment_date);
              return (
                <Link key={i} href="/antecedents/grossesse" className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">🤰 {a.appointment_type}</p>
                    <p className="text-xs text-gray-500">{a.appointment_date}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d === 0 ? "bg-red-100 text-red-700" : d <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {d === 0 ? "Aujourd'hui" : `Dans ${d}j`}
                  </span>
                </Link>
              );
            })}

            {(consultRappels ?? []).map((c, i) => {
              const d = daysUntil(c.follow_up_date!);
              return (
                <Link key={i} href="/consultations" className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">🩺 {c.specialty ?? "Suivi"}</p>
                    <p className="text-xs text-gray-500">{c.doctor_name ?? ""} · {c.follow_up_date}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d === 0 ? "bg-red-100 text-red-700" : d <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {d === 0 ? "Aujourd'hui" : `Dans ${d}j`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Médicaments du jour */}
        {medReminders && medReminders.length > 0 && (
          <Link href="/rappels" className="card border-indigo-100 bg-indigo-50 block">
            <p className="text-xs text-indigo-700 uppercase tracking-wide font-semibold mb-2">💊 Médicaments aujourd&apos;hui</p>
            {medReminders.flatMap((m) =>
              (m.reminder_times as string[]).map((t) => (
                <div key={`${m.medication_name}-${t}`} className="flex justify-between items-center py-0.5">
                  <p className="text-sm text-gray-800">{m.medication_name}{m.dosage ? ` — ${m.dosage}` : ""}</p>
                  <span className="text-xs text-indigo-600 font-medium">{t}</span>
                </div>
              ))
            ).sort()}
          </Link>
        )}

        {/* Agenda du jour */}
        {agendaToday && agendaToday.length > 0 && (
          <Link href="/agenda" className="card border-teal-100 bg-teal-50 block">
            <p className="text-xs text-teal-700 uppercase tracking-wide font-semibold mb-2">📅 Rendez-vous aujourd&apos;hui</p>
            {agendaToday.map((a, i) => (
              <div key={i} className="flex justify-between items-center py-0.5">
                <p className="text-sm text-gray-800">{a.title}</p>
                {a.appointment_time && <span className="text-xs text-teal-600 font-medium">{a.appointment_time}</span>}
              </div>
            ))}
          </Link>
        )}

        {/* Traitements actifs */}
        {activeTraitements && activeTraitements.length > 0 && (
          <div className="card border-blue-100 bg-blue-50">
            <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold mb-2">💊 Traitements en cours</p>
            {activeTraitements.map((t, i) => (
              <p key={i} className="text-sm text-gray-800">• {t.medication_name}</p>
            ))}
          </div>
        )}

        {/* Assistant IA */}
        <Link href="/assistant" className="card border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-3 active:opacity-80">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">A</div>
          <div className="flex-1">
            <p className="font-semibold text-white">ABIBA — Assistante IA</p>
            <p className="text-xs text-blue-200">Comprends tes examens & médicaments</p>
          </div>
          <span className="text-white/70 text-lg">→</span>
        </Link>

        {/* Scanner */}
        <Link href="/scan" className="card border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 flex items-center gap-3 active:opacity-80">
          <span className="text-3xl">📄</span>
          <div>
            <p className="font-semibold text-gray-900">Scanner un document</p>
            <p className="text-xs text-gray-500">Ordonnance, résultat d&apos;examen — extraction automatique</p>
          </div>
          <span className="ml-auto text-purple-600 text-lg">→</span>
        </Link>

        {/* Accès rapides */}
        <h2 className="section-title">Accès rapides</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/antecedents", icon: "📋", label: "Antécédents", sub: "Allergies, maladies…" },
            { href: "/rappels", icon: "⏰", label: "Rappels médicaments", sub: `${medReminders?.length ?? 0} actif(s)` },
            { href: "/symptomes", icon: "📝", label: "Symptômes", sub: "Journal quotidien" },
            { href: "/agenda", icon: "📅", label: "Agenda santé", sub: "Rendez-vous" },
            { href: "/sante", icon: "📊", label: "Tableau de bord", sub: "Graphiques santé" },
            { href: "/resultats-labo", icon: "🔬", label: "Résultats labo", sub: "Analyses médicales" },
            { href: "/consultations", icon: "🩺", label: "Consultations", sub: "Carnet médical" },
            { href: "/pediatrique", icon: "👶", label: "Pédiatrie", sub: "Croissance & PEV" },
            { href: "/structures", icon: "🏥", label: "Structures", sub: "Hôpitaux & cliniques" },
            { href: "/export", icon: "🖨️", label: "Export PDF", sub: "Carnet imprimable" },
            { href: "/famille", icon: "👨‍👩‍👧", label: "Famille", sub: `${allPersons.length} profil(s)` },
            { href: "/nutrition", icon: "🥗", label: "Nutrition", sub: "Journal alimentaire" },
            { href: "/teleconsultation", icon: "📹", label: "Téléconsult.", sub: "Consultations en ligne" },
            { href: "/documents", icon: "📁", label: "Coffre-fort", sub: `${docs?.length ?? 0} document(s)` },
            { href: "/activite", icon: "🏃", label: "Activité", sub: "Exercices & IMC" },
            { href: "/sommeil", icon: "😴", label: "Sommeil", sub: "Journal de nuits" },
            { href: "/sync-montre", icon: "⌚", label: "Montre connectée", sub: "Sync Samsung, Garmin…" },
            { href: "/parametres", icon: "⚙️", label: "Paramètres", sub: "Compte & préférences" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="card flex flex-col gap-1 active:bg-gray-50">
              <span className="text-2xl">{item.icon}</span>
              <span className="font-semibold text-gray-900 text-sm">{item.label}</span>
              <span className="text-xs text-gray-500">{item.sub}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
