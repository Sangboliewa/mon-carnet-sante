"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GrowthRecord, GrowthRecordInsert } from "@/lib/supabase/types";

// ─── Calendrier PEV (Programme Élargi de Vaccination) ───────────────────────

const PEV = [
  { age: "Naissance",  vaccines: ["BCG", "VPO 0 (polio oral)"] },
  { age: "6 semaines", vaccines: ["Pentavalent 1", "VPO 1", "Pneumo 1", "Rota 1"] },
  { age: "10 semaines",vaccines: ["Pentavalent 2", "VPO 2", "Pneumo 2", "Rota 2"] },
  { age: "14 semaines",vaccines: ["Pentavalent 3", "VPO 3", "Pneumo 3", "IPV"] },
  { age: "9 mois",     vaccines: ["Rougeole-Rubéole 1", "Fièvre jaune", "Méningite A"] },
  { age: "15–18 mois", vaccines: ["Rougeole-Rubéole 2", "Rappel Pneumo"] },
  { age: "5 ans",      vaccines: ["DTC Rappel", "VPO Rappel"] },
];

// ─── Mini sparkline ──────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const W = 200, H = 40, PAD = 4;
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const sx = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const sy = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const pts = values.map((v, i) => `${sx(i)},${sy(v)}`).join(" ");
  return (
    <svg width={W} height={H} className="w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {values.map((v, i) => <circle key={i} cx={sx(i)} cy={sy(v)} r={2.5} fill={color} />)}
    </svg>
  );
}

// ─── BMI pédiatrique (simplifié) ─────────────────────────────────────────────

function bmi(w: number, h: number) { return (w / ((h / 100) ** 2)).toFixed(1); }

function today() { return new Date().toISOString().split("T")[0]; }
function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface Props { personId: string; ageMonths: number; initialData: GrowthRecord[] }

export default function PediatriqueClient({ personId, ageMonths, initialData }: Props) {
  const [records, setRecords] = useState<GrowthRecord[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(today());
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [head, setHead] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"croissance" | "vaccins">("croissance");

  const sorted = useMemo(() =>
    [...records].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date)), [records]);

  const latest = sorted[sorted.length - 1];
  const heights = sorted.map((r) => r.height_cm).filter((v): v is number => v != null);
  const weights = sorted.map((r) => r.weight_kg).filter((v): v is number => v != null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload: GrowthRecordInsert = {
      person_id: personId,
      recorded_date: date,
      height_cm: height ? parseFloat(height) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      head_cm: head ? parseFloat(head) : null,
      notes: notes || null,
    };
    const { data } = await supabase.from("growth_records").insert(payload).select().single();
    setSaving(false);
    if (data) {
      setRecords((prev) => [...prev, data]);
      setHeight(""); setWeight(""); setHead(""); setNotes("");
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("growth_records").delete().eq("id", id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {(["croissance", "vaccins"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${activeTab === t ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
            {t === "croissance" ? "📏 Croissance" : "💉 Calendrier PEV"}
          </button>
        ))}
      </div>

      {activeTab === "croissance" && (
        <>
          {/* Résumé dernière mesure */}
          {latest && (
            <div className="card bg-green-50 border-green-100 space-y-1">
              <p className="text-xs text-green-700 uppercase tracking-wide font-semibold">Dernière mesure · {fmt(latest.recorded_date)}</p>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {latest.height_cm && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{latest.height_cm}</p>
                    <p className="text-xs text-gray-500">cm</p>
                  </div>
                )}
                {latest.weight_kg && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{latest.weight_kg}</p>
                    <p className="text-xs text-gray-500">kg</p>
                  </div>
                )}
                {latest.height_cm && latest.weight_kg && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{bmi(latest.weight_kg, latest.height_cm)}</p>
                    <p className="text-xs text-gray-500">IMC</p>
                  </div>
                )}
              </div>
              {latest.head_cm && (
                <p className="text-xs text-gray-500 text-center">Périmètre crânien : {latest.head_cm} cm</p>
              )}
            </div>
          )}

          {/* Courbes */}
          {heights.length >= 2 && (
            <div className="card space-y-1">
              <p className="text-xs text-gray-500 font-medium">Taille (cm)</p>
              <Sparkline values={heights} color="#1E6FBF" />
            </div>
          )}
          {weights.length >= 2 && (
            <div className="card space-y-1">
              <p className="text-xs text-gray-500 font-medium">Poids (kg)</p>
              <Sparkline values={weights} color="#10b981" />
            </div>
          )}

          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            {showForm ? "Annuler" : "+ Ajouter une mesure"}
          </button>

          {showForm && (
            <form onSubmit={handleAdd} className="card space-y-3">
              <div>
                <label className="label">Date *</label>
                <input type="date" required className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">Taille (cm)</label>
                  <input type="number" step="0.1" className="input-field" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="75" />
                </div>
                <div>
                  <label className="label">Poids (kg)</label>
                  <input type="number" step="0.01" className="input-field" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="9.5" />
                </div>
                <div>
                  <label className="label">PC (cm)</label>
                  <input type="number" step="0.1" className="input-field" value={head} onChange={(e) => setHead(e.target.value)} placeholder="45" />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input-field resize-none" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </form>
          )}

          {records.length === 0 && !showForm && (
            <div className="card text-center py-10 space-y-3">
              <div className="text-5xl">📏</div>
              <p className="font-semibold text-gray-800">Aucune mesure enregistrée</p>
              <p className="text-sm text-gray-500 leading-relaxed px-4">
                Suis la croissance de l&apos;enfant en enregistrant régulièrement taille, poids et périmètre crânien.
              </p>
              <button onClick={() => setShowForm(true)}
                className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
                + Ajouter une mesure
              </button>
            </div>
          )}

          {[...sorted].reverse().map((r) => (
            <div key={r.id} className="card flex items-start gap-3 border-l-4 border-l-green-400">
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">
                📏
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-sm text-gray-900">{fmt(r.recorded_date)}</p>
                  {r.height_cm && r.weight_kg && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
                      IMC {bmi(r.weight_kg, r.height_cm)}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 flex-wrap">
                  {r.height_cm && <span className="text-xs text-gray-600 font-medium">📐 {r.height_cm} cm</span>}
                  {r.weight_kg && <span className="text-xs text-gray-600 font-medium">⚖️ {r.weight_kg} kg</span>}
                  {r.head_cm && <span className="text-xs text-gray-500">PC {r.head_cm} cm</span>}
                </div>
                {r.notes && <p className="text-xs text-gray-400 italic mt-0.5">{r.notes}</p>}
                <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="text-red-400 text-xs mt-1">
                  {deletingId === r.id ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {activeTab === "vaccins" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">💉</span>
            <div>
              <p className="text-xs font-semibold text-amber-800">Calendrier PEV — OMS / Côte d&apos;Ivoire</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Âge actuel : <strong>{ageMonths < 24 ? `${ageMonths} mois` : `${Math.floor(ageMonths / 12)} ans`}</strong>
              </p>
            </div>
          </div>
          {PEV.map((step, idx) => {
            const colors = [
              { border: "border-l-blue-400", icon: "bg-blue-50", badge: "bg-blue-100 text-blue-800" },
              { border: "border-l-green-400", icon: "bg-green-50", badge: "bg-green-100 text-green-800" },
              { border: "border-l-teal-400", icon: "bg-teal-50", badge: "bg-teal-100 text-teal-800" },
              { border: "border-l-cyan-400", icon: "bg-cyan-50", badge: "bg-cyan-100 text-cyan-800" },
              { border: "border-l-amber-400", icon: "bg-amber-50", badge: "bg-amber-100 text-amber-800" },
              { border: "border-l-orange-400", icon: "bg-orange-50", badge: "bg-orange-100 text-orange-800" },
              { border: "border-l-purple-400", icon: "bg-purple-50", badge: "bg-purple-100 text-purple-800" },
            ][idx % 7];
            return (
              <div key={step.age} className={`card flex items-start gap-3 border-l-4 ${colors.border}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${colors.icon}`}>
                  💉
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge}`}>{step.age}</span>
                    <span className="text-xs text-gray-400">{step.vaccines.length} vaccin{step.vaccines.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {step.vaccines.map((v) => (
                      <span key={v} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
