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

function getGreeting(lang: "fr" | "en"): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6)  return { text: lang === "en" ? "Good night"      : "Bonne nuit",     emoji: "🌙" };
  if (h < 12) return { text: lang === "en" ? "Good morning"    : "Bonjour",        emoji: "🌅" };
  if (h < 18) return { text: lang === "en" ? "Good afternoon"  : "Bon après-midi", emoji: "☀️" };
  return       { text: lang === "en" ? "Good evening"    : "Bonsoir",        emoji: "🌆" };
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const lang = (cookieStore.get("lang")?.value ?? "fr") === "en" ? "en" : "fr";
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

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

  // ── Score Santé ──────────────────────────────────────────────────────────
  const scoreItems: { label: string; done: boolean; href: string }[] = [];
  if (person) {
    scoreItems.push({ label: t("Groupe sanguin renseigné", "Blood type filled in"), done: !!person.blood_type, href: "/profil" });
    scoreItems.push({ label: t("Date de naissance renseignée", "Date of birth filled in"), done: !!person.date_of_birth, href: "/profil" });
    scoreItems.push({ label: t("Taille & poids renseignés", "Height & weight filled in"), done: !!(person.height_cm && person.weight_kg), href: "/profil" });
    scoreItems.push({ label: t("Contact d'urgence ajouté", "Emergency contact added"), done: !!(person.emergency_contact_name), href: "/profil" });
    scoreItems.push({ label: t("Première consultation enregistrée", "First consultation recorded"), done: (consultTotal ?? 0) > 0, href: "/consultations" });
    scoreItems.push({ label: t("Vaccinations vérifiées", "Vaccinations verified"), done: (vaccinTotal ?? 0) > 0, href: "/antecedents/vaccins" });
    scoreItems.push({ label: t("Document médical ajouté", "Medical document added"), done: (docs?.length ?? 0) > 0, href: "/documents" });
    scoreItems.push({ label: t("Rappel médicament configuré", "Medication reminder set"), done: (medReminders?.length ?? 0) > 0, href: "/rappels" });
  }

  const scorePoints = [15, 10, 10, 10, 20, 20, 10, 5];
  const score = person
    ? scoreItems.reduce((acc, item, i) => acc + (item.done ? (scorePoints[i] ?? 0) : 0), 0)
    : 0;

  const greeting = getGreeting(lang);

  // ── Quick access grid ────────────────────────────────────────────────────
  const MODULES_SANTE = [
    { href: "/antecedents",    icon: "📋", label: t("Antécédents", "Medical history"), sub: t("Allergies, maladies…", "Allergies, conditions…") },
    { href: "/consultations",  icon: "🩺", label: t("Consultations", "Consultations"), sub: `${consultTotal ?? 0} ${t("enregistrée(s)", "recorded")}` },
    { href: "/resultats-labo", icon: "🔬", label: t("Résultats labo", "Lab results"),  sub: t("Analyses médicales", "Medical analyses") },
    { href: "/rappels",        icon: "⏰", label: t("Médicaments", "Medications"),     sub: `${medReminders?.length ?? 0} ${t("actif(s)", "active")}` },
    { href: "/symptomes",      icon: "📝", label: t("Symptômes", "Symptoms"),          sub: t("Journal quotidien", "Daily journal") },
    { href: "/pediatrique",    icon: "👶", label: t("Pédiatrie", "Pediatrics"),        sub: t("Croissance & PEV", "Growth & vaccines") },
  ];

  const MODULES_BIENETRE = [
    { href: "/nutrition",    icon: "🥗", label: t("Nutrition", "Nutrition"),          sub: t("Journal alimentaire", "Food journal") },
    { href: "/activite",     icon: "🏃", label: t("Activité", "Activity"),            sub: t("Exercices & IMC", "Exercise & BMI") },
    { href: "/sommeil",      icon: "😴", label: t("Sommeil", "Sleep"),                sub: t("Journal de nuits", "Sleep journal") },
    { href: "/sante",        icon: "📊", label: t("Bilan santé", "Health report"),    sub: t("Graphiques & courbes", "Charts & curves") },
    { href: "/agenda",       icon: "📅", label: t("Agenda", "Agenda"),                sub: t("Rendez-vous", "Appointments") },
    { href: "/sync-montre",  icon: "⌚", label: t("Montre connectée", "Smart watch"), sub: t("Sync Samsung, Garmin…", "Sync Samsung, Garmin…") },
  ];

  const MODULES_OUTILS = [
    { href: "/famille",          icon: "👨‍👩‍👧", label: t("Famille", "Family"),         sub: `${allPersons.length} ${t("profil(s)", "profile(s)")}` },
    { href: "/medecins",         icon: "👨‍⚕️", label: t("Médecins", "Doctors"),        sub: t("Contacts médicaux", "Medical contacts") },
    { href: "/espace-medecin",   icon: "🩺", label: t("Espace médecin", "Doctor space"), sub: t("Mon profil médecin", "My doctor profile") },
    { href: "/documents",        icon: "📁", label: t("Coffre-fort", "Safe"),          sub: `${docs?.length ?? 0} ${t("document(s)", "document(s)")}` },
    { href: "/export",           icon: "🖨️", label: t("Export PDF", "PDF Export"),    sub: t("Carnet imprimable", "Printable booklet") },
    { href: "/structures",       icon: "🏥", label: t("Structures", "Facilities"),    sub: t("Hôpitaux & cliniques", "Hospitals & clinics") },
    { href: "/pma",              icon: "🌸", label: t("Parcours PMA", "IVF Journey"),   sub: t("Fertilité & tentatives", "Fertility & attempts") },
    { href: "/prescriptions",    icon: "💊", label: t("Ordonnances", "Prescriptions"), sub: t("Médicaments prescrits", "Prescribed meds") },
    { href: "/teleconsultation", icon: "📹", label: t("Téléconsult.", "Teleconsult."),sub: t("En ligne", "Online") },
    { href: "/parametres",       icon: "⚙️", label: t("Paramètres", "Settings"),     sub: t("Compte & préférences", "Account & preferences") },
  ];

  return (
    <div>
      {person && <NotificationInit personId={person.id} />}

      {/* ── Header ───────────────────────────────────────────────────────── */}
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
            <Link href="/recherche" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-lg active:bg-white/30" aria-label="Recherche">
              🔍
            </Link>
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </div>

        {/* Profil switcher */}
        {person && allPersons.length > 1 && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-blue-200 text-xs">{t("Profil actif :", "Active profile:")}</span>
            <Link href="/famille" className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-medium">
              {person.first_name} {person.last_name ?? ""} · {allPersons.length} {t("profils", "profiles")} →
            </Link>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-4 -mt-2 animate-slide-up">

        {/* ── Bannière onboarding (si pas de profil) ─────────────────── */}
        {!person && (
          <Link href="/profil" className="block card bg-gradient-to-r from-health-blue to-indigo-600 text-white">
            <p className="font-bold text-lg">👋 {t("Bienvenue !", "Welcome!")}</p>
            <p className="text-sm text-blue-100 mt-1">{t("Créez votre profil de santé pour accéder à toutes les fonctionnalités.", "Create your health profile to access all features.")}</p>
            <div className="mt-3 inline-block bg-white text-health-blue text-sm font-semibold px-4 py-2 rounded-xl">
              {t("Créer mon profil →", "Create my profile →")}
            </div>
          </Link>
        )}

        {/* ── Score Santé ────────────────────────────────────────────────── */}
        {person && (
          <HealthScoreCard score={score} items={scoreItems} />
        )}

        {/* ── Conseil du jour ────────────────────────────────────────────── */}
        <DailyTip />

        {/* ── Alertes allergies ──────────────────────────────────────────── */}
        {allergies && allergies.length > 0 && (
          <div className="card border-red-200 bg-red-50">
            <p className="text-xs text-red-600 uppercase tracking-wide font-semibold mb-2">⚠️ {t("Allergies graves", "Severe allergies")}</p>
            {allergies.map((a, i) => (
              <p key={i} className="text-sm font-medium text-red-800">
                • {a.allergen}{a.severity === "life_threatening" && ` (${t("vie en danger", "life-threatening")})`}
              </p>
            ))}
          </div>
        )}

        {/* ── Rappels 30 jours ───────────────────────────────────────────── */}
        {totalRappels > 0 && (
          <div className="card border-amber-200 bg-amber-50 space-y-3">
            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">🔔 {t("Rappels — 30 prochains jours", "Reminders — next 30 days")}</p>

            {(vaccinsRappels ?? []).map((v, i) => {
              const d = daysUntil(v.next_dose_date!);
              return (
                <Link key={i} href="/antecedents/vaccins" className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">💉 {v.vaccine_name}</p>
                    <p className="text-xs text-gray-500">{v.next_dose_date}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d === 0 ? "bg-red-100 text-red-700" : d <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {d === 0 ? t("Aujourd'hui", "Today") : (lang === "en" ? `In ${d}d` : `Dans ${d}j`)}
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
                    {d === 0 ? t("Aujourd'hui", "Today") : (lang === "en" ? `In ${d}d` : `Dans ${d}j`)}
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
                    {d === 0 ? t("Aujourd'hui", "Today") : (lang === "en" ? `In ${d}d` : `Dans ${d}j`)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Aujourd'hui ──────────────────────────────────────────────────── */}
        {((medReminders?.length ?? 0) > 0 || (agendaToday?.length ?? 0) > 0) && (
          <div>
            <h2 className="section-title">{t("Aujourd'hui", "Today")}</h2>
            <div className="space-y-3">
              {medReminders && medReminders.length > 0 && (
                <Link href="/rappels" className="card border-indigo-100 bg-indigo-50 block">
                  <p className="text-xs text-indigo-700 uppercase tracking-wide font-semibold mb-2">💊 {t("Médicaments", "Medications")}</p>
                  {medReminders.flatMap((m) =>
                    (m.reminder_times as string[]).map((time) => (
                      <div key={`${m.medication_name}-${time}`} className="flex justify-between items-center py-0.5">
                        <p className="text-sm text-gray-800">{m.medication_name}{m.dosage ? ` — ${m.dosage}` : ""}</p>
                        <span className="text-xs text-indigo-600 font-medium">{time}</span>
                      </div>
                    ))
                  ).sort()}
                </Link>
              )}
              {agendaToday && agendaToday.length > 0 && (
                <Link href="/agenda" className="card border-teal-100 bg-teal-50 block">
                  <p className="text-xs text-teal-700 uppercase tracking-wide font-semibold mb-2">📅 {t("Rendez-vous", "Appointments")}</p>
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
                  <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold mb-2">💊 {t("Traitements en cours", "Ongoing treatments")}</p>
                  {activeTraitements.map((tr, i) => (
                    <p key={i} className="text-sm text-gray-800">• {tr.medication_name}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Outils IA ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/assistant" className="card border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col gap-2 active:opacity-80">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">A</div>
            <div>
              <p className="font-semibold text-white text-sm">By' IA</p>
              <p className="text-xs text-blue-200 mt-0.5">{t("Comprends tes examens", "Understand your reports")}</p>
            </div>
          </Link>
          <Link href="/scan" className="card border-purple-200 bg-gradient-to-br from-purple-600 to-blue-600 flex flex-col gap-2 active:opacity-80">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl">📄</div>
            <div>
              <p className="font-semibold text-white text-sm">Scanner</p>
              <p className="text-xs text-purple-200 mt-0.5">{t("Ordonnance & résultats", "Prescription & results")}</p>
            </div>
          </Link>
        </div>

        {/* ── Accès rapides — 3 catégories ──────────────────────────────── */}
        <div>
          <h2 className="section-title mt-2">{t("Santé", "Health")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODULES_SANTE.map((item) => (
              <Link key={item.href} href={item.href} className="card flex flex-col gap-1 active:scale-95 transition-transform p-3 bg-blue-50 border-0">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold text-gray-900 text-xs leading-tight">{item.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{item.sub}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title mt-2">{t("Bien-être", "Wellness")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODULES_BIENETRE.map((item) => (
              <Link key={item.href} href={item.href} className="card flex flex-col gap-1 active:scale-95 transition-transform p-3 bg-green-50 border-0">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold text-gray-900 text-xs leading-tight">{item.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{item.sub}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title mt-2">{t("Outils", "Tools")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODULES_OUTILS.map((item) => (
              <Link key={item.href} href={item.href} className="card flex flex-col gap-1 active:scale-95 transition-transform p-3 bg-gray-50 border-0">
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
            <p className="font-semibold text-red-800">{t("Carte d'urgence", "Emergency card")}</p>
            <p className="text-xs text-red-600">{t("Accès rapide · SAMU 185", "Quick access · SAMU 185")}</p>
          </div>
          <span className="ml-auto text-red-400 text-lg">→</span>
        </Link>

        <div className="h-4" />
      </div>
    </div>
  );
}
