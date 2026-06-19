"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Treatment, TreatmentInsert } from "@/lib/supabase/types";

const FREQUENCIES = ["1x/jour", "2x/jour", "3x/jour", "Matin et soir", "Avant les repas", "Au coucher", "Si besoin"];

function durationLabel(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (days < 0) return "";
  if (days < 30) return `${days} jour${days > 1 ? "s" : ""}`;
  const months = Math.round(days / 30.4);
  return `${months} mois`;
}

function isActive(item: Treatment): boolean {
  if (!item.end_date) return true;
  return new Date(item.end_date) >= new Date();
}

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
          <div>
            <label className="label">Dosage</label>
            <input name="dosage" className="input-field" value={form.dosage ?? ""} onChange={handleChange} placeholder="ex : 500 mg" />
          </div>
          <div>
            <label className="label">Fréquence</label>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {FREQUENCIES.map((f) => (
                <button key={f} type="button"
                  onClick={() => setForm((fm) => ({ ...fm, frequency: fm.frequency === f ? "" : f }))}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${form.frequency === f ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
                  {f}
                </button>
              ))}
            </div>
            <input name="frequency" className="input-field mt-2" value={form.frequency ?? ""} onChange={handleChange} placeholder="Ou saisir manuellement…" />
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
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">💊</div>
          <p className="font-semibold text-gray-800">Aucun traitement enregistré</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Conserve l&apos;historique de tes médicaments prescrits pour un meilleur suivi médical.
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            + Ajouter un traitement
          </button>
        </div>
      )}

      {/* Traitements en cours */}
      {items.filter(isActive).length > 0 && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">En cours</p>
      )}
      {items.filter(isActive).map((item) => (
        <div key={item.id} className="card flex items-start gap-3 border-l-4 border-l-blue-500">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">💊</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{item.medication_name}</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex-shrink-0">En cours</span>
            </div>
            {item.dosage && (
              <p className="text-sm font-medium text-gray-700 mt-0.5">
                {item.dosage}{item.frequency ? <span className="text-gray-400 font-normal"> · {item.frequency}</span> : ""}
              </p>
            )}
            <div className="flex gap-3 mt-0.5 flex-wrap">
              {item.start_date && (
                <p className="text-xs text-gray-400">
                  Depuis le {item.start_date}
                  {" · "}<span className="text-blue-600 font-medium">{durationLabel(item.start_date, null)}</span>
                </p>
              )}
            </div>
            {item.prescribing_doctor && <p className="text-xs text-gray-400 mt-0.5">Dr {item.prescribing_doctor}</p>}
            {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">{item.notes}</p>}
            <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-red-400 text-xs mt-2">
              {deletingId === item.id ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </div>
      ))}

      {/* Traitements terminés */}
      {items.filter((i) => !isActive(i)).length > 0 && (
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Historique</p>
      )}
      {items.filter((i) => !isActive(i)).map((item) => (
        <div key={item.id} className="card flex items-start gap-3 border-l-4 border-l-gray-200 opacity-70">
          <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">💊</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="font-semibold text-gray-700">{item.medication_name}</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">Terminé</span>
            </div>
            {item.dosage && <p className="text-sm text-gray-500 mt-0.5">{item.dosage}{item.frequency ? ` · ${item.frequency}` : ""}</p>}
            {item.start_date && (
              <p className="text-xs text-gray-400">
                {item.start_date} → {item.end_date ?? "?"} · {durationLabel(item.start_date, item.end_date)}
              </p>
            )}
            {item.prescribing_doctor && <p className="text-xs text-gray-400">Dr {item.prescribing_doctor}</p>}
            <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-red-400 text-xs mt-2">
              {deletingId === item.id ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
