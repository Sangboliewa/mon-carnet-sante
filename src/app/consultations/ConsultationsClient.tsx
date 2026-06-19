"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedicalConsultation, MedicalConsultationInsert } from "@/lib/supabase/types";

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
  const [items, setItems] = useState<MedicalConsultation[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : "+ Ajouter une consultation"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Date *</label>
            <input name="consultation_date" type="date" required className="input-field" value={form.consultation_date ?? ""} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Médecin</label>
              <input name="doctor_name" className="input-field" value={form.doctor_name ?? ""} onChange={handleChange} placeholder="Dr. Nom du médecin" />
            </div>
            <div>
              <label className="label">Spécialité</label>
              <select name="specialty" className="input-field" value={form.specialty ?? ""} onChange={handleChange}>
                <option value="">— Choisir —</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
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
            {saving ? "Enregistrement…" : "Enregistrer"}
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
            + Ajouter ma 1ère consultation
          </button>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="card space-y-1">
          <button className="w-full text-left" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{formatDate(item.consultation_date)}</p>
                <p className="text-sm text-gray-500">
                  {[item.specialty, item.doctor_name].filter(Boolean).join(" — ")}
                </p>
                {item.reason && <p className="text-xs text-gray-400 mt-0.5">Motif : {item.reason}</p>}
              </div>
              <span className="text-gray-400 text-sm mt-1">{expandedId === item.id ? "▲" : "▼"}</span>
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
                {deletingId === item.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
