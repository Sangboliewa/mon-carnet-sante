"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appointment, AppointmentInsert } from "@/lib/supabase/types";
import { useLang } from "@/lib/i18n/LanguageContext";

const SPECIALTIES = [
  "Médecine générale", "Cardiologie", "Dermatologie", "Gynécologie",
  "Neurologie", "Ophtalmologie", "ORL", "Pédiatrie", "Psychiatrie",
  "Radiologie", "Kinésithérapie", "Dentiste", "Laboratoire", "Autre",
];

const SPECIALTY_ICON: Record<string, string> = {
  "Médecine générale": "🩺", "Cardiologie": "❤️", "Dermatologie": "🧴",
  "Gynécologie": "🌸", "Neurologie": "🧠", "Ophtalmologie": "👁️",
  "ORL": "👂", "Pédiatrie": "👶", "Psychiatrie": "🧘",
  "Radiologie": "🔬", "Kinésithérapie": "💪", "Dentiste": "🦷",
  "Laboratoire": "🧪", "Autre": "🏥",
};

const SPECIALTY_BORDER: Record<string, string> = {
  "Médecine générale": "#3b82f6", "Cardiologie": "#ef4444", "Dermatologie": "#f59e0b",
  "Gynécologie": "#ec4899", "Neurologie": "#8b5cf6", "Ophtalmologie": "#06b6d4",
  "ORL": "#14b8a6", "Pédiatrie": "#f97316", "Psychiatrie": "#6366f1",
  "Radiologie": "#64748b", "Kinésithérapie": "#22c55e", "Dentiste": "#0ea5e9",
  "Laboratoire": "#a855f7", "Autre": "#6b7280",
};

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
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
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
        {showForm ? t("Annuler", "Cancel") : t("+ Ajouter un rendez-vous", "+ Add appointment")}
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
            {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
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
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">{filter === "upcoming" ? "📅" : "🗓️"}</div>
          <p className="font-semibold text-gray-800">
            {filter === "upcoming" ? t("Aucun rendez-vous à venir", "No upcoming appointments") : t("Aucun rendez-vous enregistré", "No appointments recorded")}
          </p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            {filter === "upcoming"
              ? "Planifie tes prochains rendez-vous médicaux pour recevoir des rappels automatiques."
              : "Commence à enregistrer tes rendez-vous pour avoir un historique complet."}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2"
          >
            {t("+ Ajouter un rendez-vous", "+ Add appointment")}
          </button>
        </div>
      )}

      {/* Prochain RDV highlight */}
      {filter === "upcoming" && (() => {
        const next = items.find((i) => !i.completed && i.appointment_date >= today());
        if (!next) return null;
        const d = daysUntil(next.appointment_date);
        const icon = next.specialty ? (SPECIALTY_ICON[next.specialty] ?? "🏥") : "📅";
        const borderColor = next.specialty ? (SPECIALTY_BORDER[next.specialty] ?? "#6b7280") : "#3b82f6";
        return (
          <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75 mb-1">Prochain rendez-vous</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <div className="flex-1">
                <p className="font-bold text-base leading-tight">{next.title}</p>
                <p className="text-sm opacity-85 mt-0.5">{formatDate(next.appointment_date)}{next.appointment_time ? ` · ${next.appointment_time}` : ""}</p>
                {next.doctor_name && <p className="text-xs opacity-70 mt-0.5">{next.doctor_name}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-black">{d === 0 ? "Auj." : `J-${d}`}</p>
                <div className="w-3 h-3 rounded-full mx-auto mt-1" style={{ backgroundColor: borderColor }} />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="space-y-2">
        {displayed.map((appt) => {
          const badge = apptBadge(appt);
          const icon = appt.specialty ? (SPECIALTY_ICON[appt.specialty] ?? "🏥") : "📅";
          const borderColor = appt.specialty ? (SPECIALTY_BORDER[appt.specialty] ?? "#6b7280") : "#e5e7eb";
          return (
            <div key={appt.id} className={`card flex items-start gap-3 border-l-4 ${appt.completed ? "opacity-60" : ""}`}
              style={{ borderLeftColor: borderColor }}>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: borderColor + "18" }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
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
              {appt.notes && <p className="mt-1 text-xs text-gray-500 italic">{appt.notes}</p>}
              <div className="flex gap-4 pt-1">
                <button onClick={() => handleToggle(appt)} disabled={togglingId === appt.id}
                  className={`text-xs font-medium ${appt.completed ? "text-gray-400" : "text-green-600"}`}>
                  {togglingId === appt.id ? "…" : appt.completed ? "Marquer à faire" : "Marquer effectué"}
                </button>
                <button onClick={() => handleDelete(appt.id)} disabled={deletingId === appt.id} className="text-xs text-red-400">
                  {deletingId === appt.id ? "…" : t("Supprimer", "Delete")}
                </button>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
