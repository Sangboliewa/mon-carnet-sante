"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChronicCondition, ChronicConditionInsert } from "@/lib/supabase/types";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "remission", label: "En rémission" },
  { value: "resolved", label: "Résolue" },
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
        {showForm ? "Annuler" : "+ Ajouter une maladie"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Maladie *</label>
            <input name="condition_name" required className="input-field" value={form.condition_name} onChange={handleChange} placeholder="ex : Diabète de type 2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code</label>
              <input name="condition_code" className="input-field" value={form.condition_code ?? ""} onChange={handleChange} placeholder="ex : E11" />
            </div>
            <div>
              <label className="label">Système</label>
              <input name="coding_system" className="input-field" value={form.coding_system} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Statut</label>
            <select name="status" className="input-field" value={form.status ?? ""} onChange={handleChange}>
              <option value="">— Choisir —</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
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
        <div className="card text-center text-gray-500 py-8">Aucune maladie chronique enregistrée.</div>
      )}

      {items.map((item) => {
        const st = STATUSES.find((s) => s.value === item.status);
        return (
          <div key={item.id} className="card space-y-1">
            <div className="flex justify-between items-start">
              <p className="font-semibold text-gray-900">{item.condition_name}</p>
              {st && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {st.label}
                </span>
              )}
            </div>
            {item.condition_code && (
              <p className="text-xs text-gray-400">{item.coding_system} : {item.condition_code}</p>
            )}
            {item.diagnosed_date && <p className="text-xs text-gray-400">Diagnostiqué : {item.diagnosed_date}</p>}
            {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="text-red-500 text-xs mt-2"
            >
              {deletingId === item.id ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
