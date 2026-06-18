"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DiabeteRecord {
  id: string;
  recorded_at: string;
  glucose_fasting: number | null;
  glucose_postprandial: number | null;
  hba1c: number | null;
  insulin_units: number | null;
  oral_meds_taken: boolean;
  meal_context: string | null;
  notes: string | null;
}

interface Props {
  personId: string;
  initial: DiabeteRecord[];
}

const MEAL_LABELS: Record<string, string> = {
  fasting: "À jeun",
  before_meal: "Avant repas",
  after_meal: "Après repas",
  bedtime: "Coucher",
  other: "Autre",
};

function glucoseStatus(val: number | null, context: string | null): "normal" | "warning" | "danger" | null {
  if (!val) return null;
  if (context === "fasting" || !context) {
    if (val <= 1.0) return "normal";
    if (val <= 1.26) return "warning";
    return "danger";
  }
  if (val <= 1.4) return "normal";
  if (val <= 2.0) return "warning";
  return "danger";
}

const STATUS_COLORS = {
  normal: "text-green-700 bg-green-50 border-green-200",
  warning: "text-amber-700 bg-amber-50 border-amber-200",
  danger: "text-red-700 bg-red-50 border-red-200",
};

export default function DiabeteClient({ personId, initial }: Props) {
  const [records, setRecords] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().slice(0, 16),
    glucose_fasting: "",
    glucose_postprandial: "",
    hba1c: "",
    insulin_units: "",
    oral_meds_taken: false,
    meal_context: "fasting",
    notes: "",
  });

  const supabase = createClient();

  async function save() {
    setSaving(true);
    const payload = {
      person_id: personId,
      recorded_at: form.recorded_at,
      glucose_fasting: form.glucose_fasting ? parseFloat(form.glucose_fasting) : null,
      glucose_postprandial: form.glucose_postprandial ? parseFloat(form.glucose_postprandial) : null,
      hba1c: form.hba1c ? parseFloat(form.hba1c) : null,
      insulin_units: form.insulin_units ? parseInt(form.insulin_units) : null,
      oral_meds_taken: form.oral_meds_taken,
      meal_context: form.meal_context || null,
      notes: form.notes || null,
    };
    const { data, error } = await supabase.from("diabetes_records").insert(payload).select().single();
    if (!error && data) {
      setRecords([data as DiabeteRecord, ...records]);
      setShowForm(false);
      setForm({ recorded_at: new Date().toISOString().slice(0, 16), glucose_fasting: "", glucose_postprandial: "", hba1c: "", insulin_units: "", oral_meds_taken: false, meal_context: "fasting", notes: "" });
    }
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from("diabetes_records").delete().eq("id", id);
    setRecords(records.filter(r => r.id !== id));
  }

  // Stats
  const fastingVals = records.filter(r => r.glucose_fasting).map(r => r.glucose_fasting!);
  const avgFasting = fastingVals.length ? (fastingVals.reduce((a, b) => a + b, 0) / fastingVals.length).toFixed(2) : null;
  const lastHba1c = records.find(r => r.hba1c)?.hba1c;
  const dangerCount = records.filter(r => glucoseStatus(r.glucose_fasting, r.meal_context) === "danger").length;

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{records.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Mesures</p>
        </div>
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{avgFasting ?? "–"}</p>
          <p className="text-xs text-gray-500 mt-0.5">Moy. à jeun</p>
        </div>
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className={`text-2xl font-bold ${lastHba1c && lastHba1c > 7 ? "text-red-600" : "text-green-600"}`}>
            {lastHba1c ? `${lastHba1c}%` : "–"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">HbA1c</p>
        </div>
      </div>

      {dangerCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
          <p className="text-sm text-red-700 font-medium">⚠️ {dangerCount} mesure(s) en zone danger (glycémie &gt; 1,26 g/L à jeun)</p>
        </div>
      )}

      <button onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm active:opacity-80">
        + Nouvelle mesure
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <p className="font-semibold text-gray-900">Nouvelle mesure</p>

          <div>
            <label className="text-xs text-gray-500 font-medium">Date & heure</label>
            <input type="datetime-local" value={form.recorded_at}
              onChange={e => setForm({ ...form, recorded_at: e.target.value })}
              className="input mt-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Contexte mesure</label>
            <select value={form.meal_context} onChange={e => setForm({ ...form, meal_context: e.target.value })} className="input mt-1">
              {Object.entries(MEAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Glycémie à jeun (g/L)</label>
              <input type="number" step="0.01" placeholder="ex: 0.95" value={form.glucose_fasting}
                onChange={e => setForm({ ...form, glucose_fasting: e.target.value })}
                className="input mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Post-prandiale (g/L)</label>
              <input type="number" step="0.01" placeholder="ex: 1.40" value={form.glucose_postprandial}
                onChange={e => setForm({ ...form, glucose_postprandial: e.target.value })}
                className="input mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">HbA1c (%)</label>
              <input type="number" step="0.1" placeholder="ex: 6.5" value={form.hba1c}
                onChange={e => setForm({ ...form, hba1c: e.target.value })}
                className="input mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Insuline (UI)</label>
              <input type="number" placeholder="ex: 10" value={form.insulin_units}
                onChange={e => setForm({ ...form, insulin_units: e.target.value })}
                className="input mt-1" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.oral_meds_taken}
              onChange={e => setForm({ ...form, oral_meds_taken: e.target.checked })}
              className="w-4 h-4 accent-amber-500" />
            <span className="text-sm text-gray-700">Médicament(s) oral(aux) pris</span>
          </label>

          <div>
            <label className="text-xs text-gray-500 font-medium">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Symptômes, remarques..." rows={2} className="input mt-1 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border text-gray-600 text-sm">Annuler</button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {records.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucune mesure enregistrée</p>
        )}
        {records.map(r => {
          const status = glucoseStatus(r.glucose_fasting ?? r.glucose_postprandial, r.meal_context);
          return (
            <div key={r.id} className={`rounded-2xl border p-4 ${status ? STATUS_COLORS[status] : "bg-white border-gray-200"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500">{new Date(r.recorded_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  {r.meal_context && <p className="text-xs font-medium text-gray-600 mt-0.5">{MEAL_LABELS[r.meal_context] ?? r.meal_context}</p>}
                </div>
                <button onClick={() => remove(r.id)} className="text-gray-300 text-lg px-1">×</button>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {r.glucose_fasting && (
                  <div>
                    <p className="text-xs text-gray-500">À jeun</p>
                    <p className="text-lg font-bold">{r.glucose_fasting} <span className="text-xs font-normal">g/L</span></p>
                  </div>
                )}
                {r.glucose_postprandial && (
                  <div>
                    <p className="text-xs text-gray-500">Post-prandiale</p>
                    <p className="text-lg font-bold">{r.glucose_postprandial} <span className="text-xs font-normal">g/L</span></p>
                  </div>
                )}
                {r.hba1c && (
                  <div>
                    <p className="text-xs text-gray-500">HbA1c</p>
                    <p className="text-lg font-bold">{r.hba1c}<span className="text-xs font-normal">%</span></p>
                  </div>
                )}
                {r.insulin_units && (
                  <div>
                    <p className="text-xs text-gray-500">Insuline</p>
                    <p className="text-lg font-bold">{r.insulin_units} <span className="text-xs font-normal">UI</span></p>
                  </div>
                )}
              </div>
              {r.oral_meds_taken && <p className="text-xs text-gray-500 mt-1">💊 Médicaments pris</p>}
              {r.notes && <p className="text-sm text-gray-600 mt-1 italic">{r.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
