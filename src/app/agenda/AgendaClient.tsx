"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appointment, AppointmentInsert } from "@/lib/supabase/types";

const SPECIALTIES = [
  "Médecine générale", "Cardiologie", "Dermatologie", "Gynécologie",
  "Neurologie", "Ophtalmologie", "ORL", "Pédiatrie", "Psychiatrie",
  "Radiologie", "Kinésithérapie", "Dentiste", "Laboratoire", "Autre",
];

function today() { return new Date().toISOString().split("T")[0]; }

function daysUntil(d: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(d).getTime() - t.getTime()) / 86400000);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function apptBadge(appt: Appointment): { label: string; cls: string } {
  if (appt.completed) return { label: "Effectué", cls: "bg-gray-100 text-gray-500" };
  const d = daysUntil(appt.appointment_date);
  if (d < 0)  return { label: "Passé",         cls: "bg-red-100 text-red-600" };
  if (d === 0) return { label: "Aujourd'hui",  cls: "bg-orange-100 text-orange-700" };
  if (d <= 3)  return { label: `Dans ${d}j`,   cls: "bg-orange-100 text-orange-700" };
  if (d <= 14) return { label: `Dans ${d}j`,   cls: "bg-yellow-100 text-yellow-700" };
  return               { label: `Dans ${d}j`,   cls: "bg-blue-100 text-blue-700" };
}

const BLANK: Omit<AppointmentInsert, "person_id"> = {
  appointment_date: "",
  appointment_time: "",
  title: "",
  specialty: "",
  doctor_name: "",
  location: "",
  completed: false,
  reminder_days_before: 1,
  notes: "",
};

interface Props { personId: string; initialData: Appointment[] }

export default function AgendaClient({ personId, initialData }: Props) {
  const [items, setItems] = useState<Appointment[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("appointments")
      .insert({ ...form, person_id: personId })
      .select().single();
    setSaving(false);
    if (data) {
      setItems((prev) => [...prev, data].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date)));
      setForm(BLANK);
      setShowForm(false);
    }
  }

  async function handleToggle(appt: Appointment) {
    setTogglingId(appt.id);
    const supabase = createClient();
    const { data } = await supabase.from("appointments").update({ completed: !appt.completed }).eq("id", appt.id).select().single();
    if (data) setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("appointments").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  const todayStr = today();
  const displayed = filter === "upcoming"
    ? items.filter((i) => !i.completed && i.appointment_date >= todayStr)
    : items;

  const urgentCount = items.filter((i) => !i.completed && daysUntil(i.appointment_date) <= 3 && daysUntil(i.appointment_date) >= 0).length;

  return (
    <div className="px-4 py-5 space-y-4">
      {urgentCount > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-medium text-orange-800">
          🔔 {urgentCount} rendez-vous dans les 3 prochains jours
        </div>
      )}

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : "+ Ajouter un rendez-vous"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Titre *</label>
            <input name="title" required className="input-field" value={form.title ?? ""} onChange={handleChange} placeholder="ex : Prise de sang, Radio thorax…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input name="appointment_date" type="date" required className="input-field" value={form.appointment_date ?? ""} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Heure</label>
              <input name="appointment_time" type="time" className="input-field" value={form.appointment_time ?? ""} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Spécialité</label>
            <select name="specialty" className="input-field" value={form.specialty ?? ""} onChange={handleChange}>
              <option value="">— Choisir —</option>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Médecin</label>
            <input name="doctor_name" className="input-field" value={form.doctor_name ?? ""} onChange={handleChange} placeholder="Dr. Nom du médecin" />
          </div>
          <div>
            <label className="label">Lieu</label>
            <input name="location" className="input-field" value={form.location ?? ""} onChange={handleChange} placeholder="ex : Clinique Avicenne" />
          </div>
          <div>
            <label className="label">Rappel (jours avant)</label>
            <select name="reminder_days_before" className="input-field" value={form.reminder_days_before ?? 1} onChange={handleChange}>
              <option value={0}>Le jour même</option>
              <option value={1}>1 jour avant</option>
              <option value={2}>2 jours avant</option>
              <option value={3}>3 jours avant</option>
              <option value={7}>1 semaine avant</option>
            </select>
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

      {/* Filtre */}
      <div className="flex gap-2">
        {(["upcoming", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${filter === f ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
            {f === "upcoming" ? "À venir" : "Tout l'historique"}
          </button>
        ))}
      </div>

      {displayed.length === 0 && !showForm && (
        <div className="card text-center text-gray-500 py-8 text-sm">
          {filter === "upcoming" ? "Aucun rendez-vous à venir." : "Aucun rendez-vous enregistré."}
        </div>
      )}

      <div className="space-y-2">
        {displayed.map((appt) => {
          const badge = apptBadge(appt);
          return (
            <div key={appt.id} className={`card space-y-1 ${appt.completed ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{appt.title}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(appt.appointment_date)}
                    {appt.appointment_time ? ` à ${appt.appointment_time}` : ""}
                  </p>
                  {appt.specialty && <p className="text-xs text-gray-500">{appt.specialty}{appt.doctor_name ? ` — ${appt.doctor_name}` : ""}</p>}
                  {appt.location && <p className="text-xs text-gray-400">{appt.location}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${badge.cls}`}>{badge.label}</span>
              </div>
              {appt.notes && <p className="text-xs text-gray-500 italic">{appt.notes}</p>}
              <div className="flex gap-4 pt-1">
                <button onClick={() => handleToggle(appt)} disabled={togglingId === appt.id}
                  className={`text-xs font-medium ${appt.completed ? "text-gray-400" : "text-green-600"}`}>
                  {togglingId === appt.id ? "…" : appt.completed ? "Marquer à faire" : "Marquer effectué"}
                </button>
                <button onClick={() => handleDelete(appt.id)} disabled={deletingId === appt.id} className="text-xs text-red-400">
                  {deletingId === appt.id ? "…" : "Supprimer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
