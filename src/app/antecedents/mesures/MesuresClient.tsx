"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VitalMeasurement, VitalMeasurementInsert } from "@/lib/supabase/types";
import { useLang } from "@/lib/i18n/LanguageContext";

// ─── Config ─────────────────────────────────────────────────────────────────

type MeasurementType = VitalMeasurementInsert["measurement_type"];

const TYPES: { value: MeasurementType; label: string; labelEn: string; icon: string; unit: string; secondary?: string; secondaryEn?: string; normalMin?: number; normalMax?: number; hint?: string; hintEn?: string }[] = [
  { value: "blood_pressure",      label: "Tension artérielle",  labelEn: "Blood pressure",    icon: "🩺", unit: "mmHg",  secondary: "Diastolique",     secondaryEn: "Diastolic",    normalMin: 60, normalMax: 80,  hint: "ex : 120 / 80",  hintEn: "e.g. 120 / 80" },
  { value: "blood_glucose",       label: "Glycémie",            labelEn: "Blood glucose",     icon: "🩸", unit: "g/L",   normalMin: 0.7, normalMax: 1.1, hint: "ex : 0.9",           hintEn: "e.g. 0.9" },
  { value: "heart_rate",          label: "Fréquence cardiaque", labelEn: "Heart rate",        icon: "❤️", unit: "bpm",   normalMin: 60, normalMax: 100 },
  { value: "weight",              label: "Poids",               labelEn: "Weight",            icon: "⚖️", unit: "kg" },
  { value: "temperature",         label: "Température",         labelEn: "Temperature",       icon: "🌡️", unit: "°C",   normalMin: 36.1, normalMax: 37.2 },
  { value: "oxygen_saturation",   label: "Saturation O₂",       labelEn: "O₂ saturation",     icon: "💨", unit: "%",    normalMin: 95, normalMax: 100 },
];

const CONTEXTS: { value: string; label: string; labelEn: string }[] = [
  { value: "fasting",        label: "À jeun",       labelEn: "Fasting" },
  { value: "after_meal",     label: "Après repas",  labelEn: "After meal" },
  { value: "before_meal",    label: "Avant repas",  labelEn: "Before meal" },
  { value: "at_rest",        label: "Au repos",     labelEn: "At rest" },
  { value: "after_exercise", label: "Après effort", labelEn: "After exercise" },
  { value: "other",          label: "Autre",        labelEn: "Other" },
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
  const cfg = TYPES.find((tp) => tp.value === m.measurement_type);
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

function WeightChart({ weights, heightCm, lang }: { weights: VitalMeasurement[]; heightCm: number | null; lang: string }) {
  const tl = (fr: string, en: string) => lang === "en" ? en : fr;
  if (weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const W = 320, H = 120, PAD = { t: 10, r: 12, b: 32, l: 36 };
  const vals = sorted.map(m => m.value_primary);
  const minV = Math.min(...vals) - 1, maxV = Math.max(...vals) + 1;
  const sx = (i: number) => PAD.l + (i / (sorted.length - 1)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => PAD.t + (1 - (v - minV) / (maxV - minV)) * (H - PAD.t - PAD.b);
  const pts = sorted.map((m, i) => `${sx(i)},${sy(m.value_primary)}`).join(" ");
  const area = `M${sx(0)},${sy(sorted[0].value_primary)} ` + sorted.slice(1).map((m,i) => `L${sx(i+1)},${sy(m.value_primary)}`).join(" ") + ` L${sx(sorted.length-1)},${H-PAD.b} L${sx(0)},${H-PAD.b} Z`;
  const imcOf = (w: number) => heightCm ? (w / ((heightCm/100)**2)).toFixed(1) : null;
  const latest = sorted[sorted.length - 1];
  const oldest = sorted[0];
  const diff = latest.value_primary - oldest.value_primary;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">📈 {tl("Évolution du poids", "Weight trend")}</p>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diff < 0 ? "bg-green-100 text-green-700" : diff > 0 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
            {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {[minV, (minV+maxV)/2, maxV].map((v,i) => (
          <g key={i}>
            <line x1={PAD.l} y1={sy(v)} x2={W-PAD.r} y2={sy(v)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PAD.l-4} y={sy(v)+4} textAnchor="end" fontSize={9} fill="#9ca3af">{v.toFixed(0)}</text>
          </g>
        ))}
        <path d={area} fill="#1E6FBF" fillOpacity={0.08} />
        <polyline points={pts} fill="none" stroke="#1E6FBF" strokeWidth={2} strokeLinejoin="round" />
        {sorted.map((m, i) => (
          <circle key={i} cx={sx(i)} cy={sy(m.value_primary)} r={3} fill="#1E6FBF" />
        ))}
        {[0, sorted.length-1].map(i => (
          <text key={i} x={sx(i)} y={H-PAD.b+14} textAnchor="middle" fontSize={9} fill="#6b7280">
            {new Date(sorted[i].measured_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}
          </text>
        ))}
      </svg>
      <div className="flex gap-3 text-center">
        <div className="flex-1 bg-gray-50 rounded-xl py-2">
          <p className="text-xs text-gray-400">{tl("Dernier", "Latest")}</p>
          <p className="font-bold text-gray-900">{latest.value_primary} kg</p>
          {imcOf(latest.value_primary) && <p className="text-xs text-blue-600">IMC {imcOf(latest.value_primary)}</p>}
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl py-2">
          <p className="text-xs text-gray-400">{tl("Mesures", "Readings")}</p>
          <p className="font-bold text-gray-900">{sorted.length}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl py-2">
          <p className="text-xs text-gray-400">Min / Max</p>
          <p className="font-bold text-gray-900 text-xs">{Math.min(...vals).toFixed(0)} / {Math.max(...vals).toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}

function ImcBlock({ weights, heightCm, lang }: { weights: VitalMeasurement[]; heightCm: number | null; lang: string }) {
  const tl = (fr: string, en: string) => lang === "en" ? en : fr;
  if (!heightCm || !weights.length) return null;
  const latest = weights[0];
  const imc = latest.value_primary / ((heightCm / 100) ** 2);
  const label = imc < 18.5
    ? tl("Insuffisance pondérale", "Underweight")
    : imc < 25
    ? tl("Poids normal", "Normal weight")
    : imc < 30
    ? tl("Surpoids", "Overweight")
    : tl("Obésité", "Obesity");
  const color = imc < 18.5 ? "text-blue-600" : imc < 25 ? "text-green-600" : imc < 30 ? "text-orange-600" : "text-red-600";
  return (
    <div className="card border-cyan-100 bg-cyan-50">
      <p className="text-xs text-cyan-700 uppercase tracking-wide font-semibold mb-1">{tl("IMC calculé", "Calculated BMI")}</p>
      <p className={`text-3xl font-bold ${color}`}>{imc.toFixed(1)}</p>
      <p className={`text-sm font-medium ${color}`}>{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{tl("Taille", "Height")} : {heightCm} cm · {tl("Poids", "Weight")} : {latest.value_primary} kg</p>
    </div>
  );
}

interface Props { personId: string; initialData: VitalMeasurement[]; heightCm?: number | null }

export default function MesuresClient({ personId, initialData, heightCm }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

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

  const cfg = TYPES.find((tp) => tp.value === activeType)!;
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

  function handleTypeChange(type: MeasurementType) {
    setActiveType(type);
    const c = TYPES.find((x) => x.value === type)!;
    setForm((f) => ({ ...f, measurement_type: type, unit: c.unit, value_secondary: c.secondary ? (f.value_secondary ?? null) : null }));
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
      <WeightChart weights={weightMeasures} heightCm={heightCm ?? null} lang={lang} />
      <ImcBlock weights={weightMeasures} heightCm={heightCm ?? null} lang={lang} />

      {/* Type selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {TYPES.map((tp) => (
          <button
            key={tp.value}
            onClick={() => handleTypeChange(tp.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeType === tp.value
                ? "bg-health-blue text-white border-health-blue"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            <span>{tp.icon}</span>{t(tp.label, tp.labelEn)}
          </button>
        ))}
      </div>

      {/* Résumé dernière mesure */}
      {latest && (
        <div className={`rounded-xl border p-4 space-y-2 ${status === "alert" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("Dernière mesure", "Latest reading")}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === "alert" ? "bg-red-100 text-red-700" : status === "normal" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {status === "alert" ? t("Hors norme", "Out of range") : status === "normal" ? t("Normal", "Normal") : "—"}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatVal(latest)}</p>
          <p className="text-xs text-gray-500">{new Date(latest.measured_at).toLocaleString("fr-FR")}</p>
        </div>
      )}

      {/* Sparkline */}
      {filtered.length >= 2 && (
        <div className="card">
          <p className="text-xs text-gray-500 mb-2">{t("Évolution", "Trend")} ({filtered.length} {t("mesures", "readings")})</p>
          <Sparkline values={sparkValues} normalMin={cfg.normalMin} normalMax={cfg.normalMax} />
          {cfg.normalMin && <p className="text-xs text-gray-400 mt-1">{t("Zone verte = plage normale", "Green zone = normal range")}</p>}
        </div>
      )}

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? t("Annuler", "Cancel") : `+ ${t("Ajouter", "Add")} ${t(cfg.label.toLowerCase(), cfg.labelEn.toLowerCase())}`}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div className={cfg.secondary ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <label className="label">{cfg.secondary ? t("Systolique", "Systolic") : t("Valeur", "Value")} * ({cfg.unit})</label>
              <input name="value_primary" type="number" step="0.01" required className="input-field"
                value={form.value_primary || ""} onChange={handleChange} placeholder={cfg.hintEn && lang === "en" ? cfg.hintEn : cfg.hint} />
            </div>
            {cfg.secondary && (
              <div>
                <label className="label">{t(cfg.secondary, cfg.secondaryEn ?? cfg.secondary)} ({cfg.unit})</label>
                <input name="value_secondary" type="number" step="0.01" className="input-field"
                  value={form.value_secondary ?? ""} onChange={handleChange} />
              </div>
            )}
          </div>
          <div>
            <label className="label">{t("Date et heure", "Date and time")}</label>
            <input name="measured_at" type="datetime-local" className="input-field"
              value={form.measured_at ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="label">{t("Contexte", "Context")}</label>
            <select name="context" className="input-field" value={form.context ?? ""} onChange={handleChange}>
              <option value="">{t("— Choisir —", "— Choose —")}</option>
              {CONTEXTS.map((c) => <option key={c.value} value={c.value}>{t(c.label, c.labelEn)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("Notes", "Notes")}</label>
            <textarea name="notes" className="input-field resize-none" rows={2} value={form.notes ?? ""} onChange={handleChange} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
          </button>
        </form>
      )}

      {filtered.length === 0 && !showForm && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">{cfg.icon}</div>
          <p className="font-semibold text-gray-800">{t("Aucune mesure enregistrée", "No reading recorded")}</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            {t(
              `Commence à suivre ta ${cfg.label.toLowerCase()} pour observer ton évolution dans le temps.`,
              `Start tracking your ${cfg.labelEn.toLowerCase()} to observe your progress over time.`
            )}
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            {t("+ Ajouter une mesure", "+ Add a reading")}
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
                      {s === "alert" ? t("⚠ Hors norme", "⚠ Out of range") : t("✓ Normal", "✓ Normal")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(item.measured_at).toLocaleString("fr-FR")}</p>
                {item.context && <p className="text-xs text-gray-500">{t(CONTEXTS.find(c => c.value === item.context)?.label ?? "", CONTEXTS.find(c => c.value === item.context)?.labelEn ?? "")}</p>}
                <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-red-400 text-xs mt-1">
                  {deletingId === item.id ? t("Suppression…", "Deleting…") : t("Supprimer", "Delete")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
