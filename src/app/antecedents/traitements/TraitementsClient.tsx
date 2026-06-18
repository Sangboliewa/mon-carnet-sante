"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Treatment, TreatmentInsert } from "@/lib/supabase/types";

const BLANK: Omit<TreatmentInsert, "person_id"> = {
  medication_name: "",
  medication_code: "",
  coding_system: "INTERNE",
  dosage: "",
  frequency: "",
  start_date: null,
  end_date: null,
  prescribing_doctor: "",
  notes: "",
};

interface Props {
  personId: string;
  initialData: Treatment[];
}

export default function TraitementsClient({ personId, initialData }: Props) {
  const [items, setItems] = useState<Treatment[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("treatments")
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
    await supabase.from("treatments").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : "+ Ajouter un traitement"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Médicament *</label>
            <input name="medication_name" required className="input-field" value={form.medication_name} onChange={handleChange} placeholder="ex : Metformine" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code</label>
              <input name="medication_code" className="input-field" value={form.medication_code ?? ""} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Système</label>
              <input name="coding_system" className="input-field" value={form.coding_system} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dosage</label>
              <input name="dosage" className="input-field" value={form.dosage ?? ""} onChange={handleChange} placeholder="ex : 500 mg" />
            </div>
            <div>
              <label className="label">Fréquence</label>
              <input name="frequency" className="input-field" value={form.frequency ?? ""} onChange={handleChange} placeholder="ex : 2x/jour" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date de début</label>
              <input name="start_date" type="date" className="input-field" value={form.start_date ?? ""} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Date de fin</label>
              <input name="end_date" type="date" className="input-field" value={form.end_date ?? ""} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Médecin prescripteur</label>
            <input name="prescribing_doctor" className="input-field" value={form.prescribing_doctor ?? ""} onChange={handleChange} placeholder="Dr. Nom du médecin" />
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
        <div className="card text-center text-gray-500 py-8">Aucun traitement enregistré.</div>
      )}

      {items.map((item) => (
        <div key={item.id} className="card space-y-1">
          <div className="flex justify-between items-start">
            <p className="font-semibold text-gray-900">{item.medication_name}</p>
            {!item.end_date && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                En cours
              </span>
            )}
          </div>
          {item.dosage && <p className="text-sm text-gray-600">{item.dosage}{item.frequency ? ` — ${item.frequency}` : ""}</p>}
          {item.start_date && (
            <p className="text-xs text-gray-400">
              Du {item.start_date}{item.end_date ? ` au ${item.end_date}` : ""}
            </p>
          )}
          {item.prescribing_doctor && <p className="text-xs text-gray-400">Prescrit par : {item.prescribing_doctor}</p>}
          {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
          <button
            onClick={() => handleDelete(item.id)}
            disabled={deletingId === item.id}
            className="text-red-500 text-xs mt-2"
          >
            {deletingId === item.id ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      ))}
    </div>
  );
}
