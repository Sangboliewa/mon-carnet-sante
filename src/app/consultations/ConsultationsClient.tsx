"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedicalConsultation, MedicalConsultationInsert } from "@/lib/supabase/types";
import { useLang } from "@/lib/i18n/LanguageContext";

const SPECIALTY_COLORS: Record<string, string> = {
  "Médecine générale": "bg-blue-100 text-blue-700",
  "Cardiologie":       "bg-red-100 text-red-700",
  "Dermatologie":      "bg-orange-100 text-orange-700",
  "Gynécologie":       "bg-pink-100 text-pink-700",
  "Neurologie":        "bg-purple-100 text-purple-700",
  "Ophtalmologie":     "bg-cyan-100 text-cyan-700",
  "ORL":               "bg-teal-100 text-teal-700",
  "Pédiatrie":         "bg-green-100 text-green-700",
  "Psychiatrie":       "bg-violet-100 text-violet-700",
  "Radiologie":        "bg-sky-100 text-sky-700",
  "Rhumatologie":      "bg-amber-100 text-amber-700",
  "Urologie":          "bg-indigo-100 text-indigo-700",
};

const SPECIALTY_BORDER: Record<string, string> = {
  "Médecine générale": "#3b82f6",
  "Cardiologie":       "#ef4444",
  "Dermatologie":      "#f97316",
  "Gynécologie":       "#ec4899",
  "Neurologie":        "#a855f7",
  "Ophtalmologie":     "#06b6d4",
  "ORL":               "#14b8a6",
  "Pédiatrie":         "#22c55e",
  "Psychiatrie":       "#7c3aed",
  "Radiologie":        "#0ea5e9",
  "Rhumatologie":      "#f59e0b",
  "Urologie":          "#6366f1",
  "Autre":             "#9ca3af",
};

const SPECIALTY_ICONS: Record<string, string> = {
  "Médecine générale": "🩺", "Cardiologie": "❤️", "Dermatologie": "🧴",
  "Gynécologie": "🌸", "Neurologie": "🧠", "Ophtalmologie": "👁️",
  "ORL": "👂", "Pédiatrie": "👶", "Psychiatrie": "🧘",
  "Radiologie": "🔬", "Rhumatologie": "🦴", "Urologie": "💧",
  "Autre": "🏥",
};

const SPECIALTIES = [
  "Médecine générale", "Cardiologie", "Dermatologie", "Gynécologie",
  "Neurologie", "Ophtalmologie", "ORL", "Pédiatrie", "Psychiatrie",
  "Radiologie", "Rhumatologie", "Urologie", "Autre",
];

const BLANK: Omit<MedicalConsultationInsert, "person_id"> = {
  consultation_date: "",
  doctor_name: "",
  specialty: "",
  reason: "",
  diagnosis: "",
  prescription_text: "",
  follow_up_date: null,
  location: "",
  notes: "",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface Props { personId: string; initialData: MedicalConsultation[] }

export default function ConsultationsClient({ personId, initialData }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [items, setItems] = useState<MedicalConsultation[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("medical_consultations")
      .insert({ ...form, person_id: personId })
      .select()
      .single();
    setSaving(false);
    if (data) {
      setItems((prev) => [data, ...prev]);
      setForm(BLANK);
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("medical_consultations").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  const filtered = search.trim()
    ? items.filter(i =>
        [i.doctor_name, i.specialty, i.reason, i.diagnosis, i.location]
          .some(f => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = items.filter(
    (i) => i.follow_up_date && i.follow_up_date >= today
  ).sort((a, b) => (a.follow_up_date ?? "").localeCompare(b.follow_up_date ?? ""));

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Rappels suivi */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800">Consultations de suivi à venir</p>
          {upcoming.slice(0, 3).map((c) => {
            const days = Math.round((new Date(c.follow_up_date!).getTime() - new Date(today).getTime()) / 86400000);
            return (
              <div key={c.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-800">{c.specialty ?? "Consultation"}</p>
                  <p className="text-xs text-gray-500">{c.doctor_name ?? ""}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${days <= 7 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                  {days === 0 ? "Aujourd'hui" : `Dans ${days}j`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      {items.length > 3 && (
        <div className="relative">
          <input
            type="search"
            placeholder="Rechercher par médecin, spécialité, motif…"
            className="input-field pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>
      )}

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? t("Annuler", "Cancel") : t("+ Ajouter une consultation", "+ Add consultation")}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Date *</label>
            <input name="consultation_date" type="date" required className="input-field" value={form.consultation_date ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Médecin</label>
            <input name="doctor_name" className="input-field" value={form.doctor_name ?? ""} onChange={handleChange} placeholder="Dr. Nom du médecin" />
          </div>
          <div>
            <label className="label">Spécialité</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {SPECIALTIES.map((s) => (
                <button key={s} type="button"
                  onClick={() => setForm((f) => ({ ...f, specialty: f.specialty === s ? "" : s }))}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${form.specialty === s ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
                  <span>{SPECIALTY_ICONS[s] ?? "🏥"}</span>{s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Motif</label>
            <input name="reason" className="input-field" value={form.reason ?? ""} onChange={handleChange} placeholder="ex : douleur abdominale" />
          </div>
          <div>
            <label className="label">Diagnostic</label>
            <textarea name="diagnosis" className="input-field resize-none" rows={2} value={form.diagnosis ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Ordonnance / Prescription</label>
            <textarea name="prescription_text" className="input-field resize-none" rows={3} value={form.prescription_text ?? ""} onChange={handleChange} placeholder="ex : Paracétamol 1g x3/j pendant 5 jours" />
          </div>
          <div>
            <label className="label">Date de suivi</label>
            <input name="follow_up_date" type="date" className="input-field" value={form.follow_up_date ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Lieu</label>
            <input name="location" className="input-field" value={form.location ?? ""} onChange={handleChange} placeholder="ex : CHU de Cocody" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" className="input-field resize-none" rows={2} value={form.notes ?? ""} onChange={handleChange} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
          </button>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">🩺</div>
          <p className="font-semibold text-gray-800">Commence ton carnet médical</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Enregistre tes consultations pour avoir un historique complet et ne plus jamais perdre une information médicale.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            {t("+ Ajouter ma 1ère consultation", "+ Add my 1st consultation")}
          </button>
        </div>
      )}

      {search && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">{t(`Aucun résultat pour « ${search} »`, `No results for "${search}"`)}</p>
      )}

      {filtered.map((item) => (
        <div key={item.id} className="card flex items-start gap-3 border-l-4"
          style={{ borderLeftColor: item.specialty ? (SPECIALTY_BORDER[item.specialty] ?? "#9ca3af") : "#e5e7eb" }}>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0 mt-0.5">
            {item.specialty ? (SPECIALTY_ICONS[item.specialty] ?? "🏥") : "🩺"}
          </div>
          <div className="flex-1 min-w-0">
          <button className="w-full text-left" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(item.consultation_date)}</p>
                  {item.specialty && (
                    <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + (SPECIALTY_COLORS[item.specialty] ?? "bg-gray-100 text-gray-600")}>
                      {item.specialty}
                    </span>
                  )}
                </div>
                {item.doctor_name && <p className="text-sm text-gray-600 mt-0.5">Dr. {item.doctor_name.replace(/^Dr\.?\s*/i, "")}</p>}
                {item.reason && <p className="text-xs text-gray-400 mt-0.5 truncate">Motif : {item.reason}</p>}
              </div>
              <span className="text-gray-300 text-sm mt-0.5 shrink-0">{expandedId === item.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {expandedId === item.id && (
            <div className="pt-2 space-y-1 border-t border-gray-100 mt-1">
              {item.diagnosis && (
                <div>
                  <p className="text-xs font-semibold text-gray-600">Diagnostic</p>
                  <p className="text-sm text-gray-700">{item.diagnosis}</p>
                </div>
              )}
              {item.prescription_text && (
                <div>
                  <p className="text-xs font-semibold text-gray-600">Ordonnance</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{item.prescription_text}</p>
                </div>
              )}
              {item.follow_up_date && (
                <p className="text-xs text-blue-600">Suivi prévu : {formatDate(item.follow_up_date)}</p>
              )}
              {item.location && <p className="text-xs text-gray-400">{item.location}</p>}
              {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
              <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-red-500 text-xs mt-1">
                {deletingId === item.id ? t("Suppression…", "Deleting…") : t("Supprimer", "Delete")}
              </button>
            </div>
          )}
          </div>
        </div>
      ))}
    </div>
  );
}

