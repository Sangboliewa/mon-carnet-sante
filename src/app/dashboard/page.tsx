import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AllergyRow } from "@/lib/supabase/types";
import { getCurrentPerson, getAllPersons } from "@/lib/getCurrentPerson";
import LogoutButton from "./LogoutButton";
import NotificationInit from "@/components/NotificationInit";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HealthScoreCard from "@/components/HealthScoreCard";
import DailyTip from "@/components/DailyTip";
import StreakBadge from "@/components/StreakBadge";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6)  return { text: "Bonne nuit", emoji: "🌙" };
  if (h < 12) return { text: "Bonjour", emoji: "🌅" };
  if (h < 18) return { text: "Bon après-midi", emoji: "☀️" };
  return { text: "Bonsoir", emoji: "🌆" };
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
    { count: consultTotal },
    { count: vaccinTotal },
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
        supabase.from("medical_consultations").select("*", { count: "exact", head: true }).eq("person_id", person.id),
        supabase.from("vaccinations").select("*", { count: "exact", head: true }).eq("person_id", person.id),
      ])
    : [
        { data: null }, { data: null }, { data: null }, { data: null },
        { data: null }, { data: null }, { data: null }, { data: null },
        { count: 0 }, { count: 0 },
      ];

  const totalRappels = (vaccinsRappels?.length ?? 0) + (prenatalRappels?.length ?? 0) + (consultRappels?.length ?? 0);

  // ── Score Santé ──────────────────────────────────────────────
  const scoreItems: { label: string; done: boolean; href: string }[] = [];
  if (person) {
    scoreItems.push({ label: "Groupe sanguin renseigné", done: !!person.blood_type, href: "/profil" });
    scoreItems.push({ label: "Date de naissance renseignée", done: !!person.date_of_birth, href: "/profil" });
    scoreItems.push({ label: "Taille & poids renseignés", done: !!(person.height_cm && person.weight_kg), href: "/profil" });
    scoreItems.push({ label: "Contact d'urgence ajouté", done: !!(person as Record<string, unknown>).emergency_contact_name, href: "/profil" });
    scoreItems.push({ label: "Première consultation enregistrée", done: (consultTotal ?? 0) > 0, href: "/consultations" });
    scoreItems.push({ label: "Vaccinations vérifiées", done: (vaccinTotal ?? 0) > 0, href: "/antecedents/vaccins" });
    scoreItems.push({ label: "Document médical ajouté", done: (docs?.length ?? 0) > 0, href: "/documents" });
    scoreItems.push({ label: "Rappel médicament configuré", done: (medReminders?.length ?? 0) > 0, href: "/rappels" });
  }

  const scorePoints = [15, 10, 10, 10, 20, 20, 10, 5];
  const score = person
    ? scoreItems.reduce((acc, item, i) => acc + (item.done ? (scorePoints[i] ?? 0) : 0), 0)
    : 0;

  const greeting = getGreeting();

  // ── Quick access grid ────────────────────────────────────────
  const MODULES_SANTE = [
    { href: "/antecedents",    icon: "📋", label: "Antécédents",      sub: "Allergies, maladies…" },
    { href: "/consultations",  icon: "🩺", label: "Consultations",     sub: `${consultTotal ?? 0} enregistrée(s)` },
    { href: "/resultats-labo", icon: "🔬", label: "Résultats labo",    sub: "Analyses médicales" },
    { href: "/rappels",        icon: "⏰", label: "Médicaments",       sub: `${medReminders?.length ?? 0} actif(s)` },
    { href: "/symptomes",      icon: "📝", label: "Symptômes",         sub: "Journal quotidien" },
    { href: "/pediatrique",    icon: "👶", label: "Pédiatrie",          sub: "Croissance & PEV" },
  ];

  const MODULES_BIENETRE = [
    { href: "/nutrition",    icon: "🥗", label: "Nutrition",       sub: "Journal alimentaire" },
    { href: "/activite",     icon: "🏃", label: "Activité",        sub: "Exercices & IMC" },
    { href: "/sommeil",      icon: "😴", label: "Sommeil",         sub: "Journal de nuits" },
    { href: "/sante",        icon: "📊", label: "Bilan santé",     sub: "Graphiques & courbes" },
    { href: "/agenda",       icon: "📅", label: "Agenda",          sub: "Rendez-vous" },
    { href: "/sync-montre",  icon: "⌚", label: "Montre connectée", sub: "Sync Samsung, Garmin…" },
  ];

  const MODULES_OUTILS = [
    { href: "/famille",          icon: "👨‍👩‍👧", label: "Famille",       sub: `${allPersons.length} profil(s)` },
    { href: "/documents",        icon: "📁", label: "Coffre-fort",    sub: `${docs?.length ?? 0} document(s)` },
    { href: "/export",           icon: "🖨️", label: "Export PDF",     sub: "Carnet imprimable" },
    { href: "/structures",       icon: "🏥", label: "Structures",     sub: "Hôpitaux & cliniques" },
    { href: "/teleconsultation", icon: "📹", label: "Téléconsult.",   sub: "En ligne" },
    { href: "/parametres",       icon: "⚙️", label: "Paramètres",    sub: "Compte & préférences" },
  ];

  return (
    <div>
      {person && <NotificationInit personId={person.id} />}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-health-blue to-indigo-700 px-4 pt-12 pb-8">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-200 text-sm flex items-center gap-1.5">
              <span>{greeting.emoji}</span>
              <span>{greeting.text},</span>
            </p>
            <h1 className="text-white text-2xl font-bold mt-0.5">
              {person?.first_name ?? user.email?.split("@")[0] ?? "Toi"}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {person?.blood_type && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                  🩸 {person.blood_type}
                </span>
              )}
              <StreakBadge />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </div>

        {/* Profil switcher */}
        {person && allPersons.length > 1 && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-blue-200 text-xs">Profil actif :</span>
            <Link href="/famille" className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-medium">
              {person.first_name} {person.last_name ?? ""} · {allPersons.length} profils →
            </Link>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-4 -mt-2">

        {/* ── Bannière onboarding (si pas de profil) ─────────── */}
        {!person && (
          <Link href="/profil" className="block card bg-gradient-to-r from-health-blue to-indigo-600 text-white">
            <p className="font-bold text-lg">👋 Bienvenue !</p>
            <p className="text-sm text-blue-100 mt-1">Créez votre profil de santé pour accéder à toutes les fonctionnalités.</p>
            <div className="mt-3 inline-block bg-white text-health-blue text-sm font-semibold px-4 py-2 rounded-xl">
              Créer mon profil →
            </div>
          </Link>
        )}

        {/* ── Score Santé ─────────────────────────────────────── */}
        {person && (
          <HealthScoreCard score={score} items={scoreItems} />
        )}

        {/* ── Conseil du jour ─────────────────────────────────── */}
        <DailyTip />

        {/* ── Alertes allergies ───────────────────────────────── */}
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

        {/* ── Rappels 30 jours ────────────────────────────────── */}
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

        {/* ── Aujourd'hui ─────────────────────────────────────── */}
        {((medReminders?.length ?? 0) > 0 || (agendaToday?.length ?? 0) > 0) && (
          <div>
            <h2 className="section-title">Aujourd&apos;hui</h2>
            <div className="space-y-3">
              {medReminders && medReminders.length > 0 && (
                <Link href="/rappels" className="card border-indigo-100 bg-indigo-50 block">
                  <p className="text-xs text-indigo-700 uppercase tracking-wide font-semibold mb-2">💊 Médicaments</p>
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
              {agendaToday && agendaToday.length > 0 && (
                <Link href="/agenda" className="card border-teal-100 bg-teal-50 block">
                  <p className="text-xs text-teal-700 uppercase tracking-wide font-semibold mb-2">📅 Rendez-vous</p>
                  {agendaToday.map((a, i) => (
                    <div key={i} className="flex justify-between items-center py-0.5">
                      <p className="text-sm text-gray-800">{a.title}</p>
                      {a.appointment_time && <span className="text-xs text-teal-600 font-medium">{a.appointment_time}</span>}
                    </div>
                  ))}
                </Link>
              )}
              {activeTraitements && activeTraitements.length > 0 && (
                <div className="card border-blue-100 bg-blue-50">
                  <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold mb-2">💊 Traitements en cours</p>
                  {activeTraitements.map((t, i) => (
                    <p key={i} className="text-sm text-gray-800">• {t.medication_name}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Outils IA ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/assistant" className="card border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col gap-2 active:opacity-80">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">A</div>
            <div>
              <p className="font-semibold text-white text-sm">ABIBA IA</p>
              <p className="text-xs text-blue-200 mt-0.5">Comprends tes examens</p>
            </div>
          </Link>
          <Link href="/scan" className="card border-purple-200 bg-gradient-to-br from-purple-600 to-blue-600 flex flex-col gap-2 active:opacity-80">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl">📄</div>
            <div>
              <p className="font-semibold text-white text-sm">Scanner</p>
              <p className="text-xs text-purple-200 mt-0.5">Ordonnance & résultats</p>
            </div>
          </Link>
        </div>

        {/* ── Accès rapides — 3 catégories ────────────────────── */}
        <div>
          <h2 className="section-title mt-2">Santé</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODULES_SANTE.map((item) => (
              <Link key={item.href} href={item.href} className="card flex flex-col gap-1 active:bg-gray-50 p-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold text-gray-900 text-xs leading-tight">{item.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{item.sub}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title mt-2">Bien-être</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODULES_BIENETRE.map((item) => (
              <Link key={item.href} href={item.href} className="card flex flex-col gap-1 active:bg-gray-50 p-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold text-gray-900 text-xs leading-tight">{item.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{item.sub}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title mt-2">Outils</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODULES_OUTILS.map((item) => (
              <Link key={item.href} href={item.href} className="card flex flex-col gap-1 active:bg-gray-50 p-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold text-gray-900 text-xs leading-tight">{item.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{item.sub}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Carte urgence */}
        <Link href="/urgence" className="card border-red-200 bg-red-50 flex items-center gap-3 active:opacity-80">
          <span className="text-3xl">🆘</span>
          <div>
            <p className="font-semibold text-red-800">Carte d&apos;urgence</p>
            <p className="text-xs text-red-600">Accès rapide · SAMU 185</p>
          </div>
          <span className="ml-auto text-red-400 text-lg">→</span>
        </Link>

        <div className="h-4" />
      </div>
    </div>
  );
}
