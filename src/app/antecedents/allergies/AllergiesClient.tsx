"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Allergy, AllergyInsert } from "@/lib/supabase/types";
import { useLang } from "@/lib/i18n/LanguageContext";

const SEVERITIES = [
  { value: "mild",             label: "Légère",        labelEn: "Mild",            badge: "badge-severity-mild",     border: "border-l-yellow-400", icon: "bg-yellow-50", emoji: "🟡" },
  { value: "moderate",         label: "Modérée",       labelEn: "Moderate",        badge: "badge-severity-moderate", border: "border-l-orange-400", icon: "bg-orange-50", emoji: "🟠" },
  { value: "severe",           label: "Sévère",        labelEn: "Severe",          badge: "badge-severity-severe",   border: "border-l-red-500",    icon: "bg-red-50",    emoji: "🔴" },
  { value: "life_threatening", label: "Vie en danger", labelEn: "Life-threatening", badge: "badge-severity-severe",   border: "border-l-red-700",    icon: "bg-red-100",   emoji: "🚨" },
];

const COMMON_ALLERGENS = [
  { label: "Pénicilline", cat: "💊" },
  { label: "Amoxicilline", cat: "💊" },
  { label: "Aspirine", cat: "💊" },
  { label: "Ibuprofène", cat: "💊" },
  { label: "Sulfamides", cat: "💊" },
  { label: "Arachides", cat: "🥜" },
  { label: "Poisson", cat: "🐟" },
  { label: "Crevettes", cat: "🦐" },
  { label: "Lait", cat: "🥛" },
  { label: "Œufs", cat: "🥚" },
  { label: "Gluten", cat: "🌾" },
  { label: "Latex", cat: "🧤" },
];

const BLANK: Omit<AllergyInsert, "person_id"> = {
  allergen: "",
  allergen_code: "",
  coding_system: "INTERNE",
  severity: null,
  reaction: "",
  diagnosed_date: null,
  notes: "",
};

interface Props {
  personId: string;
  initialData: Allergy[];
}

export default function AllergiesClient({ personId, initialData }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const [items, setItems] = useState<Allergy[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("allergies")
      .insert({ ...form, person_id: personId } as never)
      .select()
      .single() as unknown as { data: Allergy | null; error: Error | null };
    setSaving(false);
    if (!error && data) {
      setItems((prev) => [data, ...prev]);
      setForm(BLANK);
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("allergies").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? t("Annuler", "Cancel") : t("+ Ajouter une allergie", "+ Add an allergy")}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">{t("Allergène *", "Allergen *")}</label>
            <input name="allergen" required className="input-field" value={form.allergen} onChange={handleChange} placeholder={t("ex : Pénicilline", "e.g. Penicillin")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("Code", "Code")}</label>
              <input name="allergen_code" className="input-field" value={form.allergen_code ?? ""} onChange={handleChange} placeholder="ex : J01CA04" />
            </div>
            <div>
              <label className="label">{t("Système de codage", "Coding system")}</label>
              <input name="coding_system" className="input-field" value={form.coding_system} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">{t("Allergènes fréquents", "Common allergens")}</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COMMON_ALLERGENS.map((a) => (
                <button key={a.label} type="button"
                  onClick={() => setForm((f) => ({ ...f, allergen: f.allergen === a.label ? "" : a.label }))}
                  className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1 ${form.allergen === a.label ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
                  <span>{a.cat}</span>{a.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t("Sévérité", "Severity")}</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {SEVERITIES.map((s) => (
                <button key={s.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, severity: (f.severity === s.value ? null : s.value) as typeof f.severity }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.severity === s.value ? "border-health-blue bg-health-blue-light text-health-blue" : "border-gray-100 text-gray-600"}`}>
                  <span>{s.emoji}</span>{t(s.label, s.labelEn)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t("Réaction", "Reaction")}</label>
            <input name="reaction" className="input-field" value={form.reaction ?? ""} onChange={handleChange} placeholder={t("ex : Urticaire, choc anaphylactique", "e.g. Hives, anaphylactic shock")} />
          </div>
          <div>
            <label className="label">{t("Date du diagnostic", "Diagnosis date")}</label>
            <input name="diagnosed_date" type="date" className="input-field" value={form.diagnosed_date ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">{t("Notes", "Notes")}</label>
            <textarea name="notes" className="input-field resize-none" rows={2} value={form.notes ?? ""} onChange={handleChange} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
          </button>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">⚠️</div>
          <p className="font-semibold text-gray-800">{t("Aucune allergie renseignée", "No allergy recorded")}</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            {t(
              "Enregistre tes allergies médicamenteuses et alimentaires. Elles seront affichées sur ta carte d'urgence.",
              "Record your drug and food allergies. They will appear on your emergency card."
            )}
          </p>
          <button onClick={() => setShowForm(true)} className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            {t("+ Ajouter une allergie", "+ Add an allergy")}
          </button>
        </div>
      )}

      {items.map((item) => {
        const sev = SEVERITIES.find((s) => s.value === item.severity);
        return (
          <div key={item.id} className={`card flex items-start gap-3 border-l-4 ${sev?.border ?? "border-l-gray-200"}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${sev?.icon ?? "bg-gray-50"}`}>
              {sev?.emoji ?? "⚠️"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{item.allergen}</p>
                {sev && <span className={`flex-shrink-0 ${sev.badge}`}>{t(sev.label, sev.labelEn)}</span>}
              </div>
              {item.reaction && (
                <p className="text-sm text-gray-600 mt-0.5">⚡ {item.reaction}</p>
              )}
              {item.diagnosed_date && (
                <p className="text-xs text-gray-400 mt-0.5">{t("Diagnostiqué :", "Diagnosed:")} {item.diagnosed_date}</p>
              )}
              {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">{item.notes}</p>}
              <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}
                className="text-red-400 text-xs mt-2">
                {deletingId === item.id ? t("Suppression…", "Deleting…") : t("Supprimer", "Delete")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
