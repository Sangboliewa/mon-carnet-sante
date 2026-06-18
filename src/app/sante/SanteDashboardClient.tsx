"use client";
import { useState } from "react";
import Link from "next/link";
import type { PersonRow, VitalMeasurement } from "@/lib/supabase/types";

interface LabResult {
  test_name: string;
  value: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  test_date: string;
  category: string | null;
}

interface MalariaEp {
  episode_date: string;
  severity: string | null;
  outcome: string | null;
}

interface Props {
  person: PersonRow;
  measurements: VitalMeasurement[];
  labResults: LabResult[];
  malaria: MalariaEp[];
}

const METRIC_CONFIG = {
  blood_glucose:      { label: "Glycémie",   unit: "g/L",  icon: "🩸", color: "#f59e0b", normalMin: 0.7,  normalMax: 1.26, dangerMax: 2.0  },
  blood_pressure:     { label: "Tension",    unit: "mmHg", icon: "🩺", color: "#ef4444", normalMin: 60,   normalMax: 80,   dangerMax: 100  },
  heart_rate:         { label: "Pouls",      unit: "bpm",  icon: "❤️", color: "#ec4899", normalMin: 60,   normalMax: 100,  dangerMax: 120  },
  weight:             { label: "Poids",      unit: "kg",   icon: "⚖️", color: "#8b5cf6", normalMin: null, normalMax: null, dangerMax: null },
  temperature:        { label: "Temp.",      unit: "°C",   icon: "🌡️", color: "#f97316", normalMin: 36.1, normalMax: 37.2, dangerMax: 38.5 },
  oxygen_saturation:  { label: "SpO₂",       unit: "%",    icon: "💨", color: "#06b6d4", normalMin: 95,   normalMax: 100,  dangerMax: null },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function getStatus(value: number, cfg: typeof METRIC_CONFIG[MetricKey]): "normal" | "warning" | "danger" {
  if (!cfg.normalMin || !cfg.normalMax) return "normal";
  if (cfg.dangerMax && value > cfg.dangerMax) return "danger";
  if (value < cfg.normalMin || value > cfg.normalMax) return "warning";
  return "normal";
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

function LineChart({ data, color, normalMin, normalMax, dangerMax, unit }: {
  data: { x: string; y: number; y2?: number }[];
  color: string;
  normalMin?: number | null;
  normalMax?: number | null;
  dangerMax?: number | null;
  unit: string;
}) {
  const W = 320, H = 160, PL = 38, PR = 8, PT = 8, PB = 28;
  const CW = W - PL - PR, CH = H - PT - PB;

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Pas assez de données (min. 2 mesures)
      </div>
    );
  }

  const vals = data.flatMap(d => d.y2 !== undefined ? [d.y, d.y2] : [d.y]);
  const allRef = [normalMin, normalMax, dangerMax].filter(Boolean) as number[];
  const allVals = [...vals, ...allRef];
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;

  const sx = (i: number) => PL + (i / (data.length - 1)) * CW;
  const sy = (v: number) => PT + CH - ((v - minV) / (maxV - minV)) * CH;

  const pts = data.map((d, i) => `${sx(i)},${sy(d.y)}`).join(" ");
  const pts2 = data.some(d => d.y2 !== undefined)
    ? data.map((d, i) => `${sx(i)},${sy(d.y2 ?? d.y)}`).join(" ")
    : null;

  // Y axis labels
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => minV + (i / yTicks) * (maxV - minV));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
      {/* Grid */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={PL} y1={sy(v)} x2={W - PR} y2={sy(v)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={PL - 4} y={sy(v) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
            {v.toFixed(v < 10 ? 1 : 0)}
          </text>
        </g>
      ))}

      {/* Reference zones */}
      {normalMin && normalMax && (
        <rect x={PL} y={sy(normalMax)} width={CW} height={sy(normalMin) - sy(normalMax)} fill="#d1fae5" opacity="0.5" />
      )}
      {dangerMax && (
        <line x1={PL} y1={sy(dangerMax)} x2={W - PR} y2={sy(dangerMax)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" />
      )}
      {normalMax && (
        <line x1={PL} y1={sy(normalMax)} x2={W - PR} y2={sy(normalMax)} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
      )}
      {normalMin && (
        <line x1={PL} y1={sy(normalMin)} x2={W - PR} y2={sy(normalMin)} stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" />
      )}

      {/* Line 2 (diastolic for BP) */}
      {pts2 && (
        <polyline points={pts2} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3,2" />
      )}

      {/* Main line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* Dots + X labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(d.y)} r="3.5" fill={color} />
          {i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 4) === 0 ? (
            <text x={sx(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{d.x}</text>
          ) : null}
          {d.y2 !== undefined && (
            <circle cx={sx(i)} cy={sy(d.y2)} r="2.5" fill="#94a3b8" />
          )}
        </g>
      ))}

      {/* Unit label */}
      <text x={PL - 2} y={PT + 8} textAnchor="end" fontSize="8" fill={color}>{unit}</text>
    </svg>
  );
}

// ─── Score santé ──────────────────────────────────────────────────────────────

function HealthScore({ measurements, labResults }: { measurements: VitalMeasurement[]; labResults: LabResult[] }) {
  let score = 100;
  const alerts: string[] = [];

  const types: MetricKey[] = ["blood_glucose", "blood_pressure", "heart_rate", "temperature", "oxygen_saturation"];
  for (const type of types) {
    const filtered = measurements.filter(m => m.measurement_type === type);
    if (!filtered.length) continue;
    const latest = filtered[filtered.length - 1];
    const cfg = METRIC_CONFIG[type];
    const val = type === "blood_pressure" ? (latest.value_secondary ?? latest.value_primary) : latest.value_primary;
    const status = getStatus(val, cfg);
    if (status === "danger")  { score -= 20; alerts.push(`${cfg.icon} ${cfg.label} en zone danger`); }
    else if (status === "warning") { score -= 8; alerts.push(`${cfg.icon} ${cfg.label} hors norme`); }
  }
  for (const lab of labResults.slice(0, 5)) {
    if (lab.ref_max && lab.value > lab.ref_max * 1.2) { score -= 5; alerts.push(`🔬 ${lab.test_name} élevé`); }
    if (lab.ref_min && lab.value < lab.ref_min * 0.8) { score -= 5; alerts.push(`🔬 ${lab.test_name} bas`); }
  }
  score = Math.max(0, Math.min(100, score));
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Très bon" : score >= 60 ? "À surveiller" : "Attention requise";
  const circ = 2 * Math.PI * 15.9;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Score Santé Global</p>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{score}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ color }}>{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{measurements.length} mesures enregistrées</p>
          {alerts.length > 0 && (
            <div className="mt-2 space-y-1">
              {alerts.slice(0, 3).map((a, i) => (
                <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-0.5">{a}</p>
              ))}
            </div>
          )}
          {alerts.length === 0 && measurements.length > 0 && (
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-2 py-0.5 mt-1">✓ Toutes les mesures dans la norme</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ type, measurements, onClick, active }: {
  type: MetricKey; measurements: VitalMeasurement[]; onClick: () => void; active: boolean;
}) {
  const cfg = METRIC_CONFIG[type];
  const filtered = measurements.filter(m => m.measurement_type === type);
  const latest = filtered[filtered.length - 1];

  if (!latest) return (
    <button onClick={onClick} className={`rounded-2xl border p-3 text-left transition-all ${active ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}`}>
      <p className="text-xl">{cfg.icon}</p>
      <p className="text-xs font-semibold text-gray-600 mt-1 leading-tight">{cfg.label}</p>
      <p className="text-xs text-gray-400">–</p>
    </button>
  );

  const val = type === "blood_pressure"
    ? `${latest.value_primary}/${latest.value_secondary ?? "?"}`
    : latest.value_primary.toString();
  const numVal = type === "blood_pressure" ? (latest.value_secondary ?? latest.value_primary) : latest.value_primary;
  const status = getStatus(numVal, cfg);
  const dotColor = status === "normal" ? "bg-green-500" : status === "warning" ? "bg-amber-500" : "bg-red-500";

  return (
    <button onClick={onClick} className={`rounded-2xl border p-3 text-left transition-all ${active ? "border-blue-400 bg-blue-50 shadow-sm" : "border-gray-200 bg-white"}`}>
      <div className="flex justify-between items-start">
        <span className="text-xl">{cfg.icon}</span>
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-0.5`} />
      </div>
      <p className="text-xs font-semibold text-gray-600 mt-1 leading-tight">{cfg.label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{val}</p>
      <p className="text-xs text-gray-400">{cfg.unit}</p>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SanteDashboardClient({ person, measurements, labResults, malaria }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("blood_glucose");
  const metrics: MetricKey[] = ["blood_glucose", "blood_pressure", "heart_rate", "weight", "temperature", "oxygen_saturation"];

  // IMC
  let imc: number | null = null;
  if (person.height_cm) {
    const weights = measurements.filter(m => m.measurement_type === "weight");
    if (weights.length) {
      const last = weights[weights.length - 1];
      imc = last.value_primary / Math.pow(person.height_cm / 100, 2);
    }
  }

  // Chart data for active metric
  const cfg = METRIC_CONFIG[activeMetric];
  const activeData = measurements
    .filter(m => m.measurement_type === activeMetric)
    .map(m => ({
      x: fmt(m.measured_at),
      y: activeMetric === "blood_pressure" ? m.value_primary : m.value_primary,
      y2: activeMetric === "blood_pressure" ? (m.value_secondary ?? undefined) : undefined,
    }));

  const latestActive = activeData[activeData.length - 1];
  const prevActive = activeData[activeData.length - 2];
  const trend = latestActive && prevActive
    ? latestActive.y > prevActive.y ? "↑" : latestActive.y < prevActive.y ? "↓" : "→"
    : null;

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Score + IMC */}
      <div className={imc !== null ? "grid grid-cols-2 gap-3" : ""}>
        <HealthScore measurements={measurements} labResults={labResults} />
        {imc !== null && (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col justify-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">IMC</p>
            <p className={`text-3xl font-bold ${imc < 18.5 ? "text-blue-600" : imc < 25 ? "text-green-600" : imc < 30 ? "text-amber-600" : "text-red-600"}`}>
              {imc.toFixed(1)}
            </p>
            <p className={`text-xs mt-0.5 font-medium ${imc < 18.5 ? "text-blue-500" : imc < 25 ? "text-green-500" : imc < 30 ? "text-amber-500" : "text-red-500"}`}>
              {imc < 18.5 ? "Sous-poids" : imc < 25 ? "Normal ✓" : imc < 30 ? "Surpoids" : "Obésité"}
            </p>
            <p className="text-xs text-gray-400 mt-1">{person.height_cm} cm</p>
          </div>
        )}
      </div>

      {/* Paludisme recap */}
      {malaria.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-xs text-orange-700 uppercase tracking-wide font-semibold mb-2">🦟 Historique Paludisme</p>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-700">{malaria.length}</p>
              <p className="text-xs text-orange-600">Épisodes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-700">
                {malaria.filter(m => m.severity === "grave" || m.severity === "cerebral").length}
              </p>
              <p className="text-xs text-red-600">Graves</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">{malaria[0].episode_date}</p>
              <p className="text-xs text-gray-500">Dernier épisode</p>
            </div>
          </div>
        </div>
      )}

      {/* Metric selector */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Mesures vitales — 90 jours</p>
        <div className="grid grid-cols-3 gap-2">
          {metrics.map(type => (
            <MetricCard key={type} type={type} measurements={measurements}
              onClick={() => setActiveMetric(type)} active={activeMetric === type} />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-gray-800">{cfg.icon} {cfg.label}</p>
          {latestActive && (
            <div className="text-right">
              <span className="text-lg font-bold" style={{ color: cfg.color }}>
                {activeMetric === "blood_pressure"
                  ? `${latestActive.y}/${latestActive.y2 ?? "?"}`
                  : latestActive.y}
              </span>
              <span className="text-xs text-gray-500 ml-1">{cfg.unit}</span>
              {trend && (
                <span className={`ml-1 text-sm font-bold ${trend === "↑" ? "text-red-500" : trend === "↓" ? "text-blue-500" : "text-gray-400"}`}>
                  {trend}
                </span>
              )}
            </div>
          )}
        </div>
        <LineChart
          data={activeData}
          color={cfg.color}
          normalMin={cfg.normalMin}
          normalMax={cfg.normalMax}
          dangerMax={cfg.dangerMax}
          unit={cfg.unit}
        />
        {activeData.length > 0 && (
          <div className="flex gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-green-500" /> Norme min</span>
            <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-amber-500" /> Norme max</span>
            {cfg.dangerMax && <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-red-500" /> Danger</span>}
          </div>
        )}
      </div>

      {/* Lab results */}
      {labResults.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
            🔬 Derniers résultats labo
            {labResults.filter(l => (l.ref_max && l.value > l.ref_max) || (l.ref_min && l.value < l.ref_min)).length > 0 && (
              <span className="ml-2 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full text-xs">
                {labResults.filter(l => (l.ref_max && l.value > l.ref_max) || (l.ref_min && l.value < l.ref_min)).length} hors norme
              </span>
            )}
          </p>
          <div className="space-y-2">
            {labResults.slice(0, 6).map((l, i) => {
              const isHigh = l.ref_max && l.value > l.ref_max;
              const isLow = l.ref_min && l.value < l.ref_min;
              return (
                <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-700">{l.test_name}</p>
                    <p className="text-xs text-gray-400">{l.test_date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${isHigh ? "text-red-600" : isLow ? "text-blue-600" : "text-green-600"}`}>
                      {l.value} {l.unit}
                    </span>
                    {(l.ref_min || l.ref_max) && (
                      <p className="text-xs text-gray-400">Réf: {l.ref_min ?? "?"} – {l.ref_max ?? "?"}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/antecedents/mesures" className="block py-3 rounded-xl border border-blue-300 text-blue-700 text-sm font-medium text-center bg-blue-50">
          + Mesure
        </Link>
        <Link href="/resultats-labo" className="block py-3 rounded-xl border border-purple-300 text-purple-700 text-sm font-medium text-center bg-purple-50">
          + Résultat labo
        </Link>
      </div>
    </div>
  );
}
