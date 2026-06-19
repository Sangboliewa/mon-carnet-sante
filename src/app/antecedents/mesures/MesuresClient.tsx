"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VitalMeasurement, VitalMeasurementInsert } from "@/lib/supabase/types";

// ─── Config ─────────────────────────────────────────────────────────────────

type MeasurementType = VitalMeasurementInsert["measurement_type"];

const TYPES: { value: MeasurementType; label: string; icon: string; unit: string; secondary?: string; normalMin?: number; normalMax?: number; hint?: string }[] = [
  { value: "blood_pressure",      label: "Tension artérielle",  icon: "🩺", unit: "mmHg",  secondary: "Diastolique",     normalMin: 60, normalMax: 80,  hint: "ex : 120 / 80" },
  { value: "blood_glucose",       label: "Glycémie",            icon: "🩸", unit: "g/L",   normalMin: 0.7, normalMax: 1.1, hint: "ex : 0.9" },
  { value: "heart_rate",          label: "Fréquence cardiaque", icon: "❤️", unit: "bpm",   normalMin: 60, normalMax: 100 },
  { value: "weight",              label: "Poids",               icon: "⚖️", unit: "kg" },
  { value: "temperature",         label: "Température",         icon: "🌡️", unit: "°C",   normalMin: 36.1, normalMax: 37.2 },
  { value: "oxygen_saturation",   label: "Saturation O₂",       icon: "💨", unit: "%",    normalMin: 95, normalMax: 100 },
];

const CONTEXTS = [
  { value: "fasting",        label: "À jeun" },
  { value: "after_meal",     label: "Après repas" },
  { value: "before_meal",    label: "Avant repas" },
  { value: "at_rest",        label: "Au repos" },
  { value: "after_exercise", label: "Après effort" },
  { value: "other",          label: "Autre" },
];

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({ values, normalMin, normalMax }: { values: number[]; normalMin?: number; normalMax?: number }) {
  if (values.length < 2) return null;
  const W = 200, H = 48, PAD = 4;
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const scaleY = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const scaleX = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const pts = values.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ");

  return (
    <svg width={W} height={H} className="w-full">
      {normalMin !== undefined && normalMax !== undefined && (
        <rect
          x={PAD} y={scaleY(normalMax)}
          width={W - PAD * 2} height={scaleY(normalMin) - scaleY(normalMax)}
          fill="#d1fae5" opacity={0.6}
        />
      )}
      <polyline points={pts} fill="none" stroke="#1E6FBF" strokeWidth={1.5} strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r={2.5} fill="#1E6FBF" />
      ))}
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVal(m: VitalMeasurement): string {
  if (m.measurement_type === "blood_pressure" && m.value_secondary != null)
    return `${m.value_primary} / ${m.value_secondary} ${m.unit}`;
  return `${m.value_primary} ${m.unit}`;
}

function normalStatus(m: VitalMeasurement): "normal" | "alert" | "unknown" {
  const cfg = TYPES.find((t) => t.value === m.measurement_type);
  if (!cfg?.normalMin || !cfg?.normalMax) return "unknown";
  const v = m.measurement_type === "blood_pressure" ? m.value_secondary ?? m.value_primary : m.value_primary;
  return v >= cfg.normalMin && v <= cfg.normalMax ? "normal" : "alert";
}

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// ─── Component ───────────────────────────────────────────────────────────────

function ImcBlock({ weights, heightCm }: { weights: VitalMeasurement[]; heightCm: number | null }) {
  if (!heightCm || !weights.length) return null;
  const latest = weights[0];
  const imc = latest.value_primary / ((heightCm / 100) ** 2);
  const label = imc < 18.5 ? "Insuffisance pondérale" : imc < 25 ? "Poids normal" : imc < 30 ? "Surpoids" : "Obésité";
  const color = imc < 18.5 ? "text-blue-600" : imc < 25 ? "text-green-600" : imc < 30 ? "text-orange-600" : "text-red-600";
  return (
    <div className="card border-cyan-100 bg-cyan-50">
      <p className="text-xs text-cyan-700 uppercase tracking-wide font-semibold mb-1">IMC calculé</p>
      <p className={`text-3xl font-bold ${color}`}>{imc.toFixed(1)}</p>
      <p className={`text-sm font-medium ${color}`}>{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">Taille : {heightCm} cm · Poids : {latest.value_primary} kg</p>
    </div>
  );
}

interface Props { personId: string; initialData: VitalMeasurement[]; heightCm?: number | null }

export default function MesuresClient({ personId, initialData, heightCm }: Props) {
  const [items, setItems] = useState<VitalMeasurement[]>(initialData);
  const [activeType, setActiveType] = useState<MeasurementType>("blood_pressure");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<VitalMeasurementInsert, "person_id">>({
    measurement_type: "blood_pressure",
    value_primary: 0,
    value_secondary: null,
    unit: "mmHg",
    measured_at: localNow(),
    context: null,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cfg = TYPES.find((t) => t.value === activeType)!;
  const filtered = useMemo(
    () => items.filter((i) => i.measurement_type === activeType).sort((a, b) => a.measured_at.localeCompare(b.measured_at)),
    [items, activeType]
  );
  const weightMeasures = items
    .filter((i) => i.measurement_type === "weight")
    .sort((a, b) => b.measured_at.localeCompare(a.measured_at));

  const sparkValues = filtered.map((i) =>
    activeType === "blood_pressure" ? (i.value_secondary ?? i.value_primary) : i.value_primary
  );
  const latest = filtered[filtered.length - 1];

  function handleTypeChange(t: MeasurementType) {
    setActiveType(t);
    const c = TYPES.find((x) => x.value === t)!;
    setForm((f) => ({ ...f, measurement_type: t, unit: c.unit, value_secondary: c.secondary ? (f.value_secondary ?? null) : null }));
    setShowForm(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value === "" ? null : isNaN(Number(value)) ? value : name.startsWith("value") ? parseFloat(value) : value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("vital_measurements")
      .insert({ ...form, person_id: personId })
      .select()
      .single();
    setSaving(false);
    if (data) {
      setItems((prev) => [data, ...prev]);
      setShowForm(false);
      setForm((f) => ({ ...f, value_primary: 0, value_secondary: null, notes: "", measured_at: localNow() }));
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("vital_measurements").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  const status = latest ? normalStatus(latest) : null;

  return (
    <div className="px-4 py-5 space-y-4">
      <ImcBlock weights={weightMeasures} heightCm={heightCm ?? null} />

      {/* Type selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTypeChange(t.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeType === t.value
                ? "bg-health-blue text-white border-health-blue"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Résumé dernière mesure */}
      {latest && (
        <div className={`rounded-xl border p-4 space-y-2 ${status === "alert" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dernière mesure</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === "alert" ? "bg-red-100 text-red-700" : status === "normal" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {status === "alert" ? "Hors norme" : status === "normal" ? "Normal" : "—"}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatVal(latest)}</p>
          <p className="text-xs text-gray-500">{new Date(latest.measured_at).toLocaleString("fr-FR")}</p>
        </div>
      )}

      {/* Sparkline */}
      {filtered.length >= 2 && (
        <div className="card">
          <p className="text-xs text-gray-500 mb-2">Évolution ({filtered.length} mesures)</p>
          <Sparkline values={sparkValues} normalMin={cfg.normalMin} normalMax={cfg.normalMax} />
          {cfg.normalMin && <p className="text-xs text-gray-400 mt-1">Zone verte = plage normale</p>}
        </div>
      )}

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : `+ Ajouter ${cfg.label.toLowerCase()}`}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div className={cfg.secondary ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <label className="label">{cfg.secondary ? "Systolique" : "Valeur"} * ({cfg.unit})</label>
              <input name="value_primary" type="number" step="0.01" required className="input-field"
                value={form.value_primary || ""} onChange={handleChange} placeholder={cfg.hint} />
            </div>
            {cfg.secondary && (
              <div>
                <label className="label">{cfg.secondary} ({cfg.unit})</label>
                <input name="value_secondary" type="number" step="0.01" className="input-field"
                  value={form.value_secondary ?? ""} onChange={handleChange} />
              </div>
            )}
          </div>
          <div>
            <label className="label">Date et heure</label>
            <input name="measured_at" type="datetime-local" className="input-field"
              value={form.measured_at ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Contexte</label>
            <select name="context" className="input-field" value={form.context ?? ""} onChange={handleChange}>
              <option value="">— Choisir —</option>
              {CONTEXTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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

      {filtered.length === 0 && !showForm && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">{cfg.icon}</div>
          <p className="font-semibold text-gray-800">Aucune mesure enregistrée</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Commence à suivre ta {cfg.label.toLowerCase()} pour observer ton évolution dans le temps.
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            + Ajouter une mesure
          </button>
        </div>
      )}

      <div className="space-y-2">
        {[...filtered].reverse().map((item) => {
          const s = normalStatus(item);
          const borderCls = s === "alert" ? "border-l-red-400" : s === "normal" ? "border-l-green-400" : "border-l-gray-200";
          const iconBg = s === "alert" ? "bg-red-50" : s === "normal" ? "bg-green-50" : "bg-gray-50";
          return (
            <div key={item.id} className={`card flex items-start gap-3 border-l-4 ${borderCls}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${iconBg}`}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{formatVal(item)}</p>
                  {s !== "unknown" && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${s === "alert" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {s === "alert" ? "⚠ Hors norme" : "✓ Normal"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(item.measured_at).toLocaleString("fr-FR")}</p>
                {item.context && <p className="text-xs text-gray-500">{CONTEXTS.find(c => c.value === item.context)?.label}</p>}
                <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-red-400 text-xs mt-1">
                  {deletingId === item.id ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
