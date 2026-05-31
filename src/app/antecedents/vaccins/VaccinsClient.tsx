"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Vaccination, VaccinationInsert } from "@/lib/supabase/types";

const BLANK: Omit<VaccinationInsert, "person_id"> = {
  vaccine_name: "",
  vaccine_code: "",
  coding_system: "INTERNE",
  administered_date: null,
  batch_number: "",
  administering_center: "",
  next_dose_date: null,
  notes: "",
};

function getReminderStatus(nextDoseDate: string | null): { label: string; className: string } | null {
  if (!nextDoseDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(nextDoseDate);
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: "En retard", className: "bg-red-100 text-red-800" };
  if (diffDays <= 7) return { label: `Rappel dans ${diffDays}j`, className: "bg-orange-100 text-orange-800" };
  if (diffDays <= 30) return { label: `Rappel dans ${diffDays}j`, className: "bg-yellow-100 text-yellow-800" };
  return { label: "Rappel prévu", className: "bg-green-100 text-green-800" };
}

interface Props {
  personId: string;
  initialData: Vaccination[];
}

export default function VaccinsClient({ personId, initialData }: Props) {
  const [items, setItems] = useState<Vaccination[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = items.filter(
    (i) => i.next_dose_date && new Date(i.next_dose_date) <= new Date(today.getTime() + 30 * 86400000)
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vaccinations")
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
    await supabase.from("vaccinations").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-orange-800">Rappels à venir (30 jours)</p>
          {upcoming.map((v) => {
            const status = getReminderStatus(v.next_dose_date);
            return (
              <div key={v.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-800">{v.vaccine_name}</span>
                {status && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : "+ Ajouter un vaccin"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Vaccin *</label>
            <input name="vaccine_name" required className="input-field" value={form.vaccine_name} onChange={handleChange} placeholder="ex : Hépatite B" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code</label>
              <input name="vaccine_code" className="input-field" value={form.vaccine_code ?? ""} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Système</label>
              <input name="coding_system" className="input-field" value={form.coding_system} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Date d&apos;administration</label>
            <input name="administered_date" type="date" className="input-field" value={form.administered_date ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Numéro de lot</label>
            <input name="batch_number" className="input-field" value={form.batch_number ?? ""} onChange={handleChange} placeholder="ex : LOT-2024-001" />
          </div>
          <div>
            <label className="label">Centre d&apos;administration</label>
            <input name="administering_center" className="input-field" value={form.administering_center ?? ""} onChange={handleChange} placeholder="ex : CHU Cocody" />
          </div>
          <div>
            <label className="label">Prochaine dose (rappel)</label>
            <input name="next_dose_date" type="date" className="input-field" value={form.next_dose_date ?? ""} onChange={handleChange} />
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
        <div className="card text-center text-gray-500 py-8">Aucune vaccination enregistrée.</div>
      )}

      {items.map((item) => {
        const status = getReminderStatus(item.next_dose_date);
        return (
          <div key={item.id} className="card space-y-1">
            <div className="flex justify-between items-start">
              <p className="font-semibold text-gray-900">{item.vaccine_name}</p>
              {status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              )}
            </div>
            {item.administered_date && <p className="text-xs text-gray-400">Administré : {item.administered_date}</p>}
            {item.batch_number && <p className="text-xs text-gray-400">Lot : {item.batch_number}</p>}
            {item.administering_center && <p className="text-xs text-gray-400">Centre : {item.administering_center}</p>}
            {item.next_dose_date && (
              <p className="text-xs text-gray-500">Rappel prévu : {item.next_dose_date}</p>
            )}
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
