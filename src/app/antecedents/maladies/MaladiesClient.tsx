"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChronicCondition, ChronicConditionInsert } from "@/lib/supabase/types";
import { useLang } from "@/lib/i18n/LanguageContext";

const STATUSES = [
  { value: "active",    label: "Active",       labelEn: "Active",     border: "border-l-red-400",   badge: "bg-red-100 text-red-800",    icon: "bg-red-50" },
  { value: "remission", label: "En rémission", labelEn: "Remission",  border: "border-l-amber-400", badge: "bg-amber-100 text-amber-800", icon: "bg-amber-50" },
  { value: "resolved",  label: "Résolue",      labelEn: "Resolved",   border: "border-l-gray-300",  badge: "bg-gray-100 text-gray-600",  icon: "bg-gray-50" },
];

const BLANK: Omit<ChronicConditionInsert, "person_id"> = {
  condition_name: "",
  condition_code: "",
  coding_system: "INTERNE",
  status: null,
  diagnosed_date: null,
  notes: "",
};

interface Props {
  personId: string;
  initialData: ChronicCondition[];
}

export default function MaladiesClient({ personId, initialData }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const [items, setItems] = useState<ChronicCondition[]>(initialData);
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
      .from("chronic_conditions")
      .insert({ ...form, person_id: personId })
      .select()
      .single();
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
    await supabase.from("chronic_conditions").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? t("Annuler", "Cancel") : t("+ Ajouter une maladie", "+ Add a condition")}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">{t("Maladie *", "Condition *")}</label>
            <input name="condition_name" required className="input-field" value={form.condition_name} onChange={handleChange} placeholder={t("ex : Diabète de type 2", "e.g. Type 2 diabetes")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("Code", "Code")}</label>
              <input name="condition_code" className="input-field" value={form.condition_code ?? ""} onChange={handleChange} placeholder="ex : E11" />
            </div>
            <div>
              <label className="label">{t("Système", "System")}</label>
              <input name="coding_system" className="input-field" value={form.coding_system} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">{t("Statut", "Status")}</label>
            <div className="flex gap-2 mt-1">
              {STATUSES.map((s) => (
                <button key={s.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, status: (f.status === s.value ? null : s.value) as "active" | "remission" | "resolved" | null }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.status === s.value ? "border-health-blue bg-health-blue-light text-health-blue" : "border-gray-100 text-gray-600"}`}>
                  {t(s.label, s.labelEn)}
                </button>
              ))}
            </div>
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
          <div className="text-5xl">🏥</div>
          <p className="font-semibold text-gray-800">{t("Aucune maladie enregistrée", "No condition recorded")}</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            {t(
              "Note tes maladies chroniques et antécédents pour que ton médecin dispose d'un dossier complet.",
              "Record your chronic conditions and medical history so your doctor has a complete file."
            )}
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            {t("+ Ajouter une maladie", "+ Add a condition")}
          </button>
        </div>
      )}

      {items.map((item) => {
        const st = STATUSES.find((s) => s.value === item.status) ?? STATUSES[0];
        const isResolved = item.status === "resolved";
        return (
          <div key={item.id} className={`card flex items-start gap-3 border-l-4 ${st.border} ${isResolved ? "opacity-65" : ""}`}>
            <div className={`w-11 h-11 rounded-xl ${st.icon} flex items-center justify-center text-2xl flex-shrink-0`}>
              🏥
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{item.condition_name}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${st.badge}`}>
                  {t(st.label, st.labelEn)}
                </span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {item.diagnosed_date && (
                  <p className="text-xs text-gray-400">{t("Diagnostiqué :", "Diagnosed:")} <span className="font-medium">{item.diagnosed_date}</span></p>
                )}
                {item.condition_code && (
                  <p className="text-xs text-gray-400">{item.coding_system} : {item.condition_code}</p>
                )}
                {item.notes && <p className="text-xs text-gray-500 italic mt-1">{item.notes}</p>}
              </div>
              <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-red-400 text-xs mt-2">
                {deletingId === item.id ? t("Suppression…", "Deleting…") : t("Supprimer", "Delete")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
