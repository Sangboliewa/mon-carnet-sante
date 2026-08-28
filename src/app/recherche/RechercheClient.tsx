"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

interface Result {
  id: string;
  type: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  date?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; href: string }> = {
  consultation:   { icon: "🩺", label: "Consultation",      href: "/consultations" },
  medication:     { icon: "💊", label: "Médicament",        href: "/rappels" },
  vaccination:    { icon: "💉", label: "Vaccin",            href: "/antecedents/vaccins" },
  allergy:        { icon: "⚠️", label: "Allergie",          href: "/antecedents/allergies" },
  document:       { icon: "📄", label: "Document",          href: "/documents" },
  appointment:    { icon: "📅", label: "Rendez-vous",       href: "/agenda" },
  symptom:        { icon: "🤒", label: "Symptôme",          href: "/symptomes" },
  condition:      { icon: "🏥", label: "Maladie chronique", href: "/antecedents/chroniques" },
  medical_contact:{ icon: "👨‍⚕️", label: "Contact médical", href: "/medecins" },
};

export default function RechercheClient({ personId }: { personId: string }) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const supabase = createClient();
    const term = `%${q.trim()}%`;
    const all: Result[] = [];

    const [
      { data: consults },
      { data: meds },
      { data: vaccins },
      { data: allergies },
      { data: docs },
      { data: appts },
      { data: symptoms },
      { data: conditions },
      { data: contacts },
    ] = await Promise.all([
      supabase.from("medical_consultations").select("id,specialty,doctor_name,reason,consultation_date").eq("person_id", personId).or(`specialty.ilike.${term},doctor_name.ilike.${term},reason.ilike.${term}`).limit(5),
      supabase.from("medication_reminders").select("id,medication_name,dosage").eq("person_id", personId).ilike("medication_name", term).limit(5),
      supabase.from("vaccinations").select("id,vaccine_name,vaccination_date").eq("person_id", personId).ilike("vaccine_name", term).limit(5),
      supabase.from("allergies").select("id,allergen,severity").eq("person_id", personId).ilike("allergen", term).limit(5),
      supabase.from("medical_documents").select("id,file_name,document_type,created_at").eq("person_id", personId).or(`file_name.ilike.${term},document_type.ilike.${term},notes.ilike.${term}`).limit(5),
      supabase.from("appointments").select("id,title,appointment_date,appointment_time").eq("person_id", personId).ilike("title", term).limit(5),
      supabase.from("symptoms").select("id,symptom_name,severity,onset_date").eq("person_id", personId).ilike("symptom_name", term).limit(5),
      supabase.from("chronic_conditions").select("id,condition_name,diagnosis_date").eq("person_id", personId).ilike("condition_name", term).limit(5),
      supabase.from("medical_contacts").select("id,name,specialty,phone").eq("person_id", personId).or(`name.ilike.${term},specialty.ilike.${term}`).limit(5),
    ]);

    for (const c of consults ?? []) {
      all.push({ id: c.id, type: "consultation", icon: "🩺", title: c.specialty ?? "Consultation", subtitle: [c.doctor_name, c.reason].filter(Boolean).join(" · "), href: "/consultations", date: c.consultation_date });
    }
    for (const m of meds ?? []) {
      all.push({ id: m.id, type: "medication", icon: "💊", title: m.medication_name, subtitle: m.dosage ?? "Médicament", href: "/rappels" });
    }
    for (const v of vaccins ?? []) {
      all.push({ id: v.id, type: "vaccination", icon: "💉", title: v.vaccine_name, subtitle: "Vaccination", href: "/antecedents/vaccins", date: v.vaccination_date });
    }
    for (const a of allergies ?? []) {
      all.push({ id: a.id, type: "allergy", icon: "⚠️", title: a.allergen, subtitle: a.severity ?? "Allergie", href: "/antecedents/allergies" });
    }
    for (const d of docs ?? []) {
      all.push({ id: d.id, type: "document", icon: "📄", title: d.file_name, subtitle: d.document_type ?? "Document", href: `/documents/${d.id}`, date: d.created_at?.split("T")[0] });
    }
    for (const a of appts ?? []) {
      all.push({ id: a.id, type: "appointment", icon: "📅", title: a.title, subtitle: a.appointment_time ?? "Rendez-vous", href: "/agenda", date: a.appointment_date });
    }
    for (const s of symptoms ?? []) {
      all.push({ id: s.id, type: "symptom", icon: "🤒", title: s.symptom_name, subtitle: s.severity ?? "Symptôme", href: "/symptomes", date: s.onset_date });
    }
    for (const c of conditions ?? []) {
      all.push({ id: c.id, type: "condition", icon: "🏥", title: c.condition_name, subtitle: "Maladie chronique", href: "/antecedents/chroniques", date: c.diagnosis_date });
    }
    for (const c of contacts ?? []) {
      all.push({ id: c.id, type: "medical_contact", icon: "👨‍⚕️", title: c.name, subtitle: [c.specialty, c.phone].filter(Boolean).join(" · "), href: "/medecins" });
    }

    setResults(all);
    setLoading(false);
  }, [personId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    clearTimeout((window as unknown as Record<string,ReturnType<typeof setTimeout>>)._srch);
    (window as unknown as Record<string,ReturnType<typeof setTimeout>>)._srch = setTimeout(() => search(v), 350);
  }

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          autoFocus
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Médicament, médecin, symptôme, document…"
          className="input-field pl-10 pr-4"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          <p className="text-sm text-gray-400">Recherche en cours…</p>
        </div>
      )}

      {/* Résultats groupés par type */}
      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-gray-700">{t("Aucun résultat", "No results")}</p>
          <p className="text-sm text-gray-400 mt-1">Essayez un autre terme de recherche</p>
        </div>
      )}

      {!loading && Object.entries(grouped).map(([type, items]) => {
        const cfg = TYPE_CONFIG[type] ?? { icon: "📋", label: type, href: "/" };
        return (
          <div key={type}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {cfg.icon} {cfg.label} ({items.length})
            </p>
            <div className="card p-0 overflow-hidden divide-y divide-gray-100">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(r.href)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
                >
                  <span className="text-xl flex-shrink-0">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
                  </div>
                  {r.date && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                  <span className="text-gray-300">›</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Suggestions si vide */}
      {!searched && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Accès rapide</p>
          <div className="grid grid-cols-2 gap-2">
            {["Paracétamol", "Cardiologie", "Vaccin", "Ordonnance"].map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); search(s); }}
                className="card text-sm text-gray-600 text-left py-2 px-3 font-medium"
              >
                🔍 {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
