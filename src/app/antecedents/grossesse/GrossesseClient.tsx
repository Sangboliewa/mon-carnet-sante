"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Pregnancy, PregnancyInsert,
  PrenatalAppointment, PrenatalAppointmentInsert,
} from "@/lib/supabase/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toISO(d: string | null | undefined): string {
  return d ?? "";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function calcSA(lmpDate: string | null): number | null {
  if (!lmpDate) return null;
  const days = Math.floor((Date.now() - new Date(lmpDate).getTime()) / 86400000);
  return Math.max(0, Math.floor(days / 7));
}

function calcDPA(lmpDate: string | null): string | null {
  if (!lmpDate) return null;
  const d = new Date(lmpDate);
  d.setDate(d.getDate() + 280);
  return d.toISOString().split("T")[0];
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

function apptBadge(appt: PrenatalAppointment): { label: string; cls: string } {
  if (appt.completed) return { label: "Effectuée", cls: "bg-gray-100 text-gray-600" };
  const d = daysUntil(appt.appointment_date);
  if (d < 0) return { label: "Manquée", cls: "bg-red-100 text-red-700" };
  if (d === 0) return { label: "Aujourd'hui", cls: "bg-orange-100 text-orange-700" };
  if (d <= 7) return { label: `Dans ${d}j`, cls: "bg-orange-100 text-orange-700" };
  if (d <= 30) return { label: `Dans ${d}j`, cls: "bg-yellow-100 text-yellow-700" };
  return { label: `Dans ${d}j`, cls: "bg-blue-100 text-blue-700" };
}

const STATUS_LABELS: Record<string, string> = {
  ongoing: "En cours",
  delivered: "Accouchement",
  miscarriage: "Fausse couche",
  interrupted: "Interruption",
};

const APPT_TYPES = [
  "Consultation initiale",
  "Échographie 1er trimestre (11-13 SA)",
  "Consultation 2ème mois",
  "Consultation 3ème mois",
  "Échographie 2ème trimestre (20-25 SA)",
  "Consultation 4ème mois",
  "Consultation 5ème mois",
  "Consultation 6ème mois",
  "Échographie 3ème trimestre (32-34 SA)",
  "Consultation 7ème mois",
  "Consultation 8ème mois",
  "Consultation 9ème mois",
  "Autre",
];

const BLANK_APPT: Omit<PrenatalAppointmentInsert, "person_id" | "pregnancy_id"> = {
  appointment_date: "",
  appointment_time: "",
  appointment_type: "",
  healthcare_provider: "",
  location: "",
  completed: false,
  notes: "",
};

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  personId: string;
  initialPregnancy: Pregnancy | null;
  initialAppointments: PrenatalAppointment[];
}

export default function GrossesseClient({ personId, initialPregnancy, initialAppointments }: Props) {
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(initialPregnancy);
  const [appointments, setAppointments] = useState<PrenatalAppointment[]>(initialAppointments);

  // Pregnancy form
  const [showPregForm, setShowPregForm] = useState(!initialPregnancy);
  const [pregForm, setPregForm] = useState<Omit<PregnancyInsert, "person_id">>({
    lmp_date: initialPregnancy?.lmp_date ?? null,
    expected_due_date: initialPregnancy?.expected_due_date ?? null,
    actual_delivery_date: initialPregnancy?.actual_delivery_date ?? null,
    status: initialPregnancy?.status ?? "ongoing",
    notes: initialPregnancy?.notes ?? "",
  });
  const [savingPreg, setSavingPreg] = useState(false);

  // Appointment form
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptForm, setApptForm] = useState(BLANK_APPT);
  const [savingAppt, setSavingAppt] = useState(false);
  const [deletingApptId, setDeletingApptId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Derived
  const lmp = pregForm.lmp_date ?? pregnancy?.lmp_date ?? null;
  const sa = calcSA(lmp);
  const autoDPA = calcDPA(lmp);
  const dpaDisplay = pregForm.expected_due_date ?? autoDPA;

  const upcoming = appointments.filter(
    (a) => !a.completed && daysUntil(a.appointment_date) >= 0 && daysUntil(a.appointment_date) <= 30
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handlePregChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setPregForm((f) => ({
      ...f,
      [name]: value || null,
      // auto-fill DPA when LMP changes
      ...(name === "lmp_date" && value && !f.expected_due_date
        ? { expected_due_date: calcDPA(value) }
        : {}),
    }));
  }

  async function handleSavePregnancy(e: React.FormEvent) {
    e.preventDefault();
    setSavingPreg(true);
    const supabase = createClient();
    if (pregnancy) {
      const { data } = await supabase
        .from("pregnancies")
        .update(pregForm)
        .eq("id", pregnancy.id)
        .select()
        .single();
      if (data) { setPregnancy(data); setShowPregForm(false); }
    } else {
      const { data } = await supabase
        .from("pregnancies")
        .insert({ ...pregForm, person_id: personId })
        .select()
        .single();
      if (data) { setPregnancy(data); setShowPregForm(false); }
    }
    setSavingPreg(false);
  }

  function handleApptChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setApptForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value || null,
    }));
  }

  async function handleAddAppt(e: React.FormEvent) {
    e.preventDefault();
    if (!apptForm.appointment_date || !apptForm.appointment_type) return;
    setSavingAppt(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("prenatal_appointments")
      .insert({ ...apptForm, person_id: personId, pregnancy_id: pregnancy?.id ?? null })
      .select()
      .single();
    setSavingAppt(false);
    if (data) {
      setAppointments((prev) =>
        [data, ...prev].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
      );
      setApptForm(BLANK_APPT);
      setShowApptForm(false);
    }
  }

  async function handleToggleCompleted(appt: PrenatalAppointment) {
    setTogglingId(appt.id);
    const supabase = createClient();
    const { data } = await supabase
      .from("prenatal_appointments")
      .update({ completed: !appt.completed })
      .eq("id", appt.id)
      .select()
      .single();
    if (data) setAppointments((prev) => prev.map((a) => (a.id === data.id ? data : a)));
    setTogglingId(null);
  }

  async function handleDeleteAppt(id: string) {
    setDeletingApptId(id);
    const supabase = createClient();
    await supabase.from("prenatal_appointments").delete().eq("id", id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    setDeletingApptId(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-5 space-y-5">

      {/* ── Rappels dans les 30 jours ── */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-purple-800">Consultations à venir (30 jours)</p>
          {upcoming.map((a) => {
            const badge = apptBadge(a);
            return (
              <div key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">{a.appointment_type}</p>
                  <p className="text-xs text-gray-500">{formatDate(a.appointment_date)}{a.appointment_time ? ` — ${a.appointment_time}` : ""}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Résumé grossesse ── */}
      {pregnancy && !showPregForm && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-rose-800">Grossesse en cours</p>
            <button onClick={() => setShowPregForm(true)} className="text-xs text-rose-600 underline">Modifier</button>
          </div>
          {sa !== null && (
            <p className="text-2xl font-bold text-rose-700">{sa} SA <span className="text-base font-normal">semaines</span></p>
          )}
          {dpaDisplay && (
            <p className="text-sm text-gray-700">
              Date prévue d&apos;accouchement : <span className="font-semibold">{formatDate(dpaDisplay)}</span>
            </p>
          )}
          {pregnancy.lmp_date && (
            <p className="text-xs text-gray-500">Dernières règles : {formatDate(pregnancy.lmp_date)}</p>
          )}
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
            pregnancy.status === "ongoing" ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"
          }`}>
            {STATUS_LABELS[pregnancy.status]}
          </span>
          {pregnancy.notes && <p className="text-xs text-gray-500 italic">{pregnancy.notes}</p>}
        </div>
      )}

      {/* ── Formulaire grossesse ── */}
      {showPregForm && (
        <form onSubmit={handleSavePregnancy} className="card space-y-3">
          <p className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            {pregnancy ? "Modifier la grossesse" : "Démarrer le suivi"}
          </p>
          <div>
            <label className="label">Date des dernières règles (DDR)</label>
            <input name="lmp_date" type="date" className="input-field" value={toISO(pregForm.lmp_date)} onChange={handlePregChange} />
          </div>
          <div>
            <label className="label">Date prévue d&apos;accouchement (DPA)</label>
            <input name="expected_due_date" type="date" className="input-field" value={toISO(pregForm.expected_due_date)} onChange={handlePregChange} placeholder="Calculée automatiquement" />
            {autoDPA && !pregForm.expected_due_date && (
              <p className="text-xs text-gray-400 mt-1">Calculée automatiquement : {formatDate(autoDPA)}</p>
            )}
          </div>
          <div>
            <label className="label">Date d&apos;accouchement réel</label>
            <input name="actual_delivery_date" type="date" className="input-field" value={toISO(pregForm.actual_delivery_date)} onChange={handlePregChange} />
          </div>
          <div>
            <label className="label">Statut</label>
            <select name="status" className="input-field" value={pregForm.status ?? "ongoing"} onChange={handlePregChange}>
              <option value="ongoing">En cours</option>
              <option value="delivered">Accouchement</option>
              <option value="miscarriage">Fausse couche</option>
              <option value="interrupted">Interruption</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" className="input-field resize-none" rows={2} value={toISO(pregForm.notes)} onChange={handlePregChange} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={savingPreg} className="btn-primary flex-1">
              {savingPreg ? "Enregistrement…" : "Enregistrer"}
            </button>
            {pregnancy && (
              <button type="button" onClick={() => setShowPregForm(false)} className="flex-1 rounded-xl border border-gray-300 py-2 text-sm text-gray-600">
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      {/* ── Consultations prénatales ── */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Consultations prénatales</p>
          <button onClick={() => setShowApptForm((v) => !v)} className="text-sm text-health-blue font-medium">
            {showApptForm ? "Annuler" : "+ Ajouter"}
          </button>
        </div>

        {showApptForm && (
          <form onSubmit={handleAddAppt} className="card space-y-3">
            <div>
              <label className="label">Type de consultation *</label>
              <select name="appointment_type" required className="input-field" value={apptForm.appointment_type ?? ""} onChange={handleApptChange}>
                <option value="">— Choisir —</option>
                {APPT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date *</label>
                <input name="appointment_date" type="date" required className="input-field" value={apptForm.appointment_date ?? ""} onChange={handleApptChange} />
              </div>
              <div>
                <label className="label">Heure</label>
                <input name="appointment_time" type="time" className="input-field" value={apptForm.appointment_time ?? ""} onChange={handleApptChange} />
              </div>
            </div>
            <div>
              <label className="label">Médecin / Sage-femme</label>
              <input name="healthcare_provider" className="input-field" value={apptForm.healthcare_provider ?? ""} onChange={handleApptChange} placeholder="ex : Dr. Konan" />
            </div>
            <div>
              <label className="label">Lieu</label>
              <input name="location" className="input-field" value={apptForm.location ?? ""} onChange={handleApptChange} placeholder="ex : CHU de Cocody" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" className="input-field resize-none" rows={2} value={apptForm.notes ?? ""} onChange={handleApptChange} />
            </div>
            <button type="submit" disabled={savingAppt} className="btn-primary">
              {savingAppt ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}

        {appointments.length === 0 && !showApptForm && (
          <div className="card text-center text-gray-500 py-6 text-sm">Aucune consultation enregistrée.</div>
        )}

        {appointments.map((appt) => {
          const badge = apptBadge(appt);
          return (
            <div key={appt.id} className={`card space-y-1 ${appt.completed ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-start">
                <p className="font-semibold text-gray-900 text-sm">{appt.appointment_type}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
              </div>
              <p className="text-xs text-gray-500">
                {formatDate(appt.appointment_date)}{appt.appointment_time ? ` à ${appt.appointment_time}` : ""}
              </p>
              {appt.healthcare_provider && <p className="text-xs text-gray-500">{appt.healthcare_provider}</p>}
              {appt.location && <p className="text-xs text-gray-400">{appt.location}</p>}
              {appt.notes && <p className="text-xs text-gray-500 italic">{appt.notes}</p>}
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleToggleCompleted(appt)}
                  disabled={togglingId === appt.id}
                  className={`text-xs font-medium ${appt.completed ? "text-gray-400" : "text-green-600"}`}
                >
                  {togglingId === appt.id ? "…" : appt.completed ? "Marquer non effectuée" : "Marquer effectuée"}
                </button>
                <button
                  onClick={() => handleDeleteAppt(appt.id)}
                  disabled={deletingApptId === appt.id}
                  className="text-red-500 text-xs"
                >
                  {deletingApptId === appt.id ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
