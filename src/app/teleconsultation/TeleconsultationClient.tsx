"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Platform = "google_meet" | "zoom" | "whatsapp" | "teams" | "autre";
type Status = "planifie" | "termine" | "annule";

interface Teleconsultation {
  id: string;
  teleconsult_date: string;
  doctor_name: string;
  specialty: string | null;
  platform: Platform;
  meeting_url: string | null;
  duration_minutes: number | null;
  status: Status;
  chief_complaint: string | null;
  notes: string | null;
  prescription_notes: string | null;
  follow_up_date: string | null;
}

const PLATFORM_ICONS: Record<Platform, string> = { google_meet: "📹", zoom: "💻", whatsapp: "📱", teams: "👥", autre: "🩺" };
const PLATFORM_LABELS: Record<Platform, string> = { google_meet: "Google Meet", zoom: "Zoom", whatsapp: "WhatsApp", teams: "Teams", autre: "Autre" };
const STATUS_LABELS: Record<Status, string> = { planifie: "Planifié", termine: "Terminé", annule: "Annulé" };
const STATUS_COLORS: Record<Status, string> = {
  planifie: "bg-blue-100 text-blue-800",
  termine: "bg-green-100 text-green-800",
  annule: "bg-red-100 text-red-800",
};

function daysUntil(d: string) {
  const now = new Date(); now.setHours(0,0,0,0);
  const t = new Date(d); t.setHours(0,0,0,0);
  return Math.round((t.getTime() - now.getTime()) / 86400000);
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const emptyForm = {
  teleconsult_date: "", doctor_name: "", specialty: "", platform: "google_meet" as Platform,
  meeting_url: "", duration_minutes: "" as string | number, status: "planifie" as Status,
  chief_complaint: "", notes: "", prescription_notes: "", follow_up_date: "",
};

export default function TeleconsultationClient() {
  const supabase = createClient();
  const [list, setList] = useState<Teleconsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("teleconsultations").select("*").order("teleconsult_date", { ascending: false });
    setList((data ?? []) as Teleconsultation[]);
    setLoading(false);
  }

  function openNew() {
    setEditingId(null); setForm({ ...emptyForm }); setError(null); setShowModal(true);
  }
  function openEdit(tc: Teleconsultation) {
    setEditingId(tc.id);
    setForm({
      teleconsult_date: tc.teleconsult_date,
      doctor_name: tc.doctor_name,
      specialty: tc.specialty ?? "",
      platform: tc.platform,
      meeting_url: tc.meeting_url ?? "",
      duration_minutes: tc.duration_minutes ?? "",
      status: tc.status,
      chief_complaint: tc.chief_complaint ?? "",
      notes: tc.notes ?? "",
      prescription_notes: tc.prescription_notes ?? "",
      follow_up_date: tc.follow_up_date ?? "",
    });
    setError(null); setShowModal(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Non authentifié"); setSaving(false); return; }
    const payload = {
      user_id: user.id,
      teleconsult_date: form.teleconsult_date, doctor_name: form.doctor_name,
      specialty: form.specialty || null, platform: form.platform,
      meeting_url: form.meeting_url || null,
      duration_minutes: form.duration_minutes !== "" ? Number(form.duration_minutes) : null,
      status: form.status, chief_complaint: form.chief_complaint || null,
      notes: form.notes || null, prescription_notes: form.prescription_notes || null,
      follow_up_date: form.follow_up_date || null,
    };

    if (editingId) {
      const { error: err } = await supabase.from("teleconsultations").update(payload).eq("id", editingId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("teleconsultations").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false); setShowModal(false); load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette téléconsultation ?")) return;
    await supabase.from("teleconsultations").delete().eq("id", id);
    load();
  }

  async function markTermine(id: string) {
    await supabase.from("teleconsultations").update({ status: "termine" }).eq("id", id);
    load();
  }

  const upcoming = list.filter(t => t.status === "planifie").sort((a, b) => new Date(a.teleconsult_date).getTime() - new Date(b.teleconsult_date).getTime());
  const past = list.filter(t => t.status === "termine");
  const cancelled = list.filter(t => t.status === "annule");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Téléconsultations</h1>
          <p className="text-gray-500 text-sm mt-0.5">Consultations médicales en ligne</p>
        </div>
        <button onClick={openNew} className="btn-primary w-auto px-5 py-3 text-sm">+ Nouvelle</button>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Chargement…</div>}

      {!loading && (
        <>
          {/* À venir */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-blue-700 mb-3">📅 À venir ({upcoming.length})</h2>
              <div className="space-y-3">
                {upcoming.map(tc => {
                  const days = daysUntil(tc.teleconsult_date);
                  return (
                    <div key={tc.id} className="card border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl">{PLATFORM_ICONS[tc.platform]}</span>
                            <span className="font-semibold text-gray-900">{tc.doctor_name}</span>
                            {tc.specialty && <span className="text-sm text-gray-500">— {tc.specialty}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tc.status]}`}>{STATUS_LABELS[tc.status]}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {fmt(tc.teleconsult_date)}
                            {tc.duration_minutes && <span className="ml-2 text-gray-400">· {tc.duration_minutes} min</span>}
                            <span className={`ml-2 font-semibold ${days <= 0 ? "text-red-600" : days <= 3 ? "text-orange-600" : "text-blue-600"}`}>
                              {days === 0 ? "Aujourd'hui !" : days === 1 ? "Demain" : days > 0 ? `Dans ${days}j` : `Il y a ${Math.abs(days)}j`}
                            </span>
                          </div>
                          {tc.chief_complaint && <p className="text-sm text-gray-500 italic mt-0.5">Motif : {tc.chief_complaint}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5 items-end shrink-0">
                          {tc.meeting_url && (
                            <a href={tc.meeting_url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold bg-green-600 text-white px-3 py-1.5 rounded-xl hover:bg-green-700">
                              Rejoindre
                            </a>
                          )}
                          <button onClick={() => markTermine(tc.id)} className="text-xs text-gray-500 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50">
                            Marquer terminé
                          </button>
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(tc)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                            <button onClick={() => handleDelete(tc.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Terminées */}
          {past.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-green-700 mb-3">✅ Terminées ({past.length})</h2>
              <div className="space-y-2">
                {past.map(tc => (
                  <div key={tc.id} className="card border-l-4 border-l-green-400">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{PLATFORM_ICONS[tc.platform]}</span>
                          <span className="font-medium text-gray-900">{tc.doctor_name}</span>
                          {tc.specialty && <span className="text-sm text-gray-500">— {tc.specialty}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tc.status]}`}>{STATUS_LABELS[tc.status]}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{fmt(tc.teleconsult_date)}</p>
                        {tc.chief_complaint && <p className="text-xs text-gray-400 italic">{tc.chief_complaint}</p>}
                        {(tc.notes || tc.prescription_notes || tc.follow_up_date) && (
                          <button className="mt-1 text-xs text-blue-600 hover:underline"
                            onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}>
                            {expandedId === tc.id ? "▲ Masquer" : "▼ Voir notes"}
                          </button>
                        )}
                        {expandedId === tc.id && (
                          <div className="mt-2 text-sm bg-gray-50 rounded-lg p-3 space-y-2">
                            {tc.notes && <div><span className="font-medium text-gray-700">Notes :</span><p className="text-gray-600 whitespace-pre-line">{tc.notes}</p></div>}
                            {tc.prescription_notes && <div><span className="font-medium text-gray-700">Ordonnance :</span><p className="text-gray-600 whitespace-pre-line">{tc.prescription_notes}</p></div>}
                            {tc.follow_up_date && <p><span className="font-medium text-gray-700">Suivi :</span> {fmtDate(tc.follow_up_date)}</p>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEdit(tc)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                        <button onClick={() => handleDelete(tc.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Annulées */}
          {cancelled.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-red-600 mb-3">❌ Annulées ({cancelled.length})</h2>
              <div className="space-y-2">
                {cancelled.map(tc => (
                  <div key={tc.id} className="card border-l-4 border-l-red-300 opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{PLATFORM_ICONS[tc.platform]}</span>
                          <span className="font-medium text-gray-700">{tc.doctor_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tc.status]}`}>{STATUS_LABELS[tc.status]}</span>
                        </div>
                        <p className="text-sm text-gray-400">{fmt(tc.teleconsult_date)}</p>
                      </div>
                      <button onClick={() => handleDelete(tc.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {list.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">📹</div>
              <p className="font-medium text-lg">Aucune téléconsultation</p>
              <p className="text-sm mt-1">Ajoutez votre première consultation en ligne.</p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-5">{editingId ? "Modifier" : "Nouvelle téléconsultation"}</h2>
              {error && <div className="mb-4 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Date et heure *</label>
                  <input type="datetime-local" name="teleconsult_date" required className="input-field"
                    value={form.teleconsult_date} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Médecin *</label>
                    <input type="text" name="doctor_name" required className="input-field" placeholder="Dr. Traoré"
                      value={form.doctor_name} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="label">Spécialité</label>
                    <input type="text" name="specialty" className="input-field" placeholder="Généraliste…"
                      value={form.specialty} onChange={handleChange} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Plateforme</label>
                    <select name="platform" className="input-field" value={form.platform} onChange={handleChange}>
                      {(Object.keys(PLATFORM_LABELS) as Platform[]).map(p => (
                        <option key={p} value={p}>{PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Durée (min)</label>
                    <input type="number" name="duration_minutes" className="input-field" min={1} placeholder="30"
                      value={form.duration_minutes} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <label className="label">Lien de la réunion</label>
                  <input type="url" name="meeting_url" className="input-field" placeholder="https://meet.google.com/…"
                    value={form.meeting_url} onChange={handleChange} />
                </div>
                <div>
                  <label className="label">Statut</label>
                  <select name="status" className="input-field" value={form.status} onChange={handleChange}>
                    <option value="planifie">Planifié</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="label">Motif</label>
                  <input type="text" name="chief_complaint" className="input-field" placeholder="Douleurs, suivi…"
                    value={form.chief_complaint} onChange={handleChange} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea name="notes" className="input-field min-h-[70px]" placeholder="Résumé de la consultation…"
                    value={form.notes} onChange={handleChange} />
                </div>
                <div>
                  <label className="label">Ordonnance / Prescriptions</label>
                  <textarea name="prescription_notes" className="input-field min-h-[70px]" placeholder="Médicaments prescrits…"
                    value={form.prescription_notes} onChange={handleChange} />
                </div>
                <div>
                  <label className="label">Date de suivi</label>
                  <input type="date" name="follow_up_date" className="input-field"
                    value={form.follow_up_date} onChange={handleChange} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Annuler</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
