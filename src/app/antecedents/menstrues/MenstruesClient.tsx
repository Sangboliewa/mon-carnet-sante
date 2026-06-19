"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MenstrualCycle, MenstrualCycleInsert } from "@/lib/supabase/types";

const FLOW_LABELS: Record<string, string> = {
  light: "Légère",
  medium: "Modérée",
  heavy: "Abondante",
  very_heavy: "Très abondante",
};

const BLANK: Omit<MenstrualCycleInsert, "person_id"> = {
  start_date: "",
  end_date: null,
  flow: null,
  symptoms: "",
  notes: "",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function cycleDuration(start: string, end: string | null): string {
  if (!end) return "En cours";
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return `${days} jour${days > 1 ? "s" : ""}`;
}

function predictNextCycle(cycles: MenstrualCycle[]): string | null {
  const sorted = [...cycles]
    .filter((c) => c.start_date)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  if (sorted.length < 2) return null;

  const lengths: number[] = [];
  for (let i = 0; i < Math.min(sorted.length - 1, 3); i++) {
    const diff = Math.round(
      (new Date(sorted[i].start_date).getTime() - new Date(sorted[i + 1].start_date).getTime()) / 86400000
    );
    if (diff > 0 && diff < 60) lengths.push(diff);
  }
  if (!lengths.length) return null;
  const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  const last = new Date(sorted[0].start_date);
  last.setDate(last.getDate() + avg);
  return last.toISOString().split("T")[0];
}

interface Props {
  personId: string;
  initialData: MenstrualCycle[];
}

export default function MenstruesClient({ personId, initialData }: Props) {
  const [items, setItems] = useState<MenstrualCycle[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nextPredicted = predictNextCycle(items);
  const today = new Date().toISOString().split("T")[0];
  const daysUntilNext = nextPredicted
    ? Math.round((new Date(nextPredicted).getTime() - new Date(today).getTime()) / 86400000)
    : null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.start_date) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("menstrual_cycles")
      .insert({ ...form, person_id: personId })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setItems((prev) =>
        [data, ...prev].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      );
      setForm(BLANK);
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("menstrual_cycles").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {nextPredicted && (
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
          <p className="text-sm font-semibold text-pink-800 mb-1">Prochain cycle prévu</p>
          <p className="text-base font-bold text-pink-700">{formatDate(nextPredicted)}</p>
          {daysUntilNext !== null && (
            <p className="text-xs text-pink-600 mt-0.5">
              {daysUntilNext > 0
                ? `Dans ${daysUntilNext} jour${daysUntilNext > 1 ? "s" : ""}`
                : daysUntilNext === 0
                ? "Aujourd'hui"
                : `Retard de ${Math.abs(daysUntilNext)} jour${Math.abs(daysUntilNext) > 1 ? "s" : ""}`}
            </p>
          )}
          <p className="text-xs text-pink-400 mt-1">Calculé sur les {Math.min(items.length - 1, 3)} derniers cycles</p>
        </div>
      )}

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : "+ Ajouter un cycle"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Date de début *</label>
            <input name="start_date" type="date" required className="input-field" value={form.start_date ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Date de fin</label>
            <input name="end_date" type="date" className="input-field" value={form.end_date ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Flux</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["light", "medium", "heavy", "very_heavy"] as const).map((v) => (
                <button key={v} type="button"
                  onClick={() => setForm((f) => ({ ...f, flow: f.flow === v ? null : v }))}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.flow === v ? "border-pink-400 bg-pink-50 text-pink-800" : "border-gray-100 text-gray-600"}`}>
                  {FLOW_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Symptômes</label>
            <input name="symptoms" className="input-field" value={form.symptoms ?? ""} onChange={handleChange} placeholder="ex : crampes, maux de tête, fatigue" />
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
          <div className="text-5xl">🌸</div>
          <p className="font-semibold text-gray-800">Aucun cycle enregistré</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Suis tes cycles menstruels pour mieux comprendre ton corps et prédire ton prochain cycle.
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            + Ajouter un cycle
          </button>
        </div>
      )}

      {items.map((item) => {
        const isOngoing = !item.end_date;
        return (
        <div key={item.id} className={`card flex items-start gap-3 border-l-4 ${isOngoing ? "border-l-pink-500" : "border-l-pink-200"}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isOngoing ? "bg-pink-100" : "bg-pink-50"}`}>
            🌸
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{formatDate(item.start_date)}</p>
              {item.flow && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 flex-shrink-0">
                  {FLOW_LABELS[item.flow]}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isOngoing ? <span className="text-pink-600 font-medium">En cours</span> : `Durée : ${cycleDuration(item.start_date, item.end_date)}`}
            </p>
            {item.symptoms && <p className="text-xs text-gray-500 mt-0.5">Symptômes : {item.symptoms}</p>}
            {item.notes && <p className="text-xs text-gray-500 italic mt-0.5">{item.notes}</p>}
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="text-red-400 text-xs mt-2"
            >
              {deletingId === item.id ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}
