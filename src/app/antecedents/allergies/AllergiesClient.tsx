"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Allergy, AllergyInsert } from "@/lib/supabase/types";

const SEVERITIES = [
  { value: "mild", label: "Légère", badge: "badge-severity-mild" },
  { value: "moderate", label: "Modérée", badge: "badge-severity-moderate" },
  { value: "severe", label: "Sévère", badge: "badge-severity-severe" },
  { value: "life_threatening", label: "Vie en danger", badge: "badge-severity-severe" },
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
        {showForm ? "Annuler" : "+ Ajouter une allergie"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Allergène *</label>
            <input name="allergen" required className="input-field" value={form.allergen} onChange={handleChange} placeholder="ex : Pénicilline" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code</label>
              <input name="allergen_code" className="input-field" value={form.allergen_code ?? ""} onChange={handleChange} placeholder="ex : J01CA04" />
            </div>
            <div>
              <label className="label">Système de codage</label>
              <input name="coding_system" className="input-field" value={form.coding_system} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Sévérité</label>
            <select name="severity" className="input-field" value={form.severity ?? ""} onChange={handleChange}>
              <option value="">— Choisir —</option>
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Réaction</label>
            <input name="reaction" className="input-field" value={form.reaction ?? ""} onChange={handleChange} placeholder="ex : Urticaire, choc anaphylactique" />
          </div>
          <div>
            <label className="label">Date du diagnostic</label>
            <input name="diagnosed_date" type="date" className="input-field" value={form.diagnosed_date ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" className="input-field resize-none" rows={2} value={form.notes ?? ""} onChange={handleChange} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center text-gray-500 py-8">Aucune allergie enregistrée.</div>
      )}

      {items.map((item) => {
        const sev = SEVERITIES.find((s) => s.value === item.severity);
        return (
          <div key={item.id} className="card space-y-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{item.allergen}</p>
                {item.allergen_code && (
                  <p className="text-xs text-gray-400">{item.coding_system} : {item.allergen_code}</p>
                )}
              </div>
              {sev && <span className={sev.badge}>{sev.label}</span>}
            </div>
            {item.reaction && <p className="text-sm text-gray-600">Réaction : {item.reaction}</p>}
            {item.diagnosed_date && <p className="text-xs text-gray-400">Diagnostiqué : {item.diagnosed_date}</p>}
            {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="text-red-500 text-xs mt-2 active:text-red-700"
            >
              {deletingId === item.id ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
