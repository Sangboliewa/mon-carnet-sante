"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface HtaRecord {
  id: string;
  recorded_at: string;
  systolic: number;
  diastolic: number;
  heart_rate: number | null;
  arm: string | null;
  position: string | null;
  notes: string | null;
}

interface Props { personId: string; initial: HtaRecord[]; }

function bpStatus(sys: number, dia: number): "optimal" | "normal" | "elevated" | "high1" | "high2" | "crisis" {
  if (sys >= 180 || dia >= 120) return "crisis";
  if (sys >= 160 || dia >= 100) return "high2";
  if (sys >= 140 || dia >= 90)  return "high1";
  if (sys >= 130 || dia >= 80)  return "elevated";
  if (sys >= 120)               return "normal";
  return "optimal";
}

const STATUS_INFO = {
  optimal:  { label: "Optimal",          color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  normal:   { label: "Normal",           color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  elevated: { label: "Élevé",            color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  high1:    { label: "HTA Grade 1",      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  high2:    { label: "HTA Grade 2",      color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  crisis:   { label: "Crise hypertensive", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export default function HtaClient({ personId, initial }: Props) {
  const [records, setRecords] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().slice(0, 16),
    systolic: "", diastolic: "", heart_rate: "",
    arm: "left", position: "sitting", notes: "",
  });

  const supabase = createClient();

  async function save() {
    if (!form.systolic || !form.diastolic) return;
    setSaving(true);
    const { data, error } = await supabase.from("hta_records").insert({
      person_id: personId,
      recorded_at: form.recorded_at,
      systolic: parseInt(form.systolic),
      diastolic: parseInt(form.diastolic),
      heart_rate: form.heart_rate ? parseInt(form.heart_rate) : null,
      arm: form.arm || null,
      position: form.position || null,
      notes: form.notes || null,
    }).select().single();
    if (!error && data) {
      setRecords([data as HtaRecord, ...records]);
      setShowForm(false);
      setForm({ recorded_at: new Date().toISOString().slice(0, 16), systolic: "", diastolic: "", heart_rate: "", arm: "left", position: "sitting", notes: "" });
    }
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from("hta_records").delete().eq("id", id);
    setRecords(records.filter(r => r.id !== id));
  }

  // Stats
  const avgSys = records.length ? Math.round(records.reduce((s, r) => s + r.systolic, 0) / records.length) : null;
  const avgDia = records.length ? Math.round(records.reduce((s, r) => s + r.diastolic, 0) / records.length) : null;
  const crises = records.filter(r => bpStatus(r.systolic, r.diastolic) === "crisis").length;
  const latest = records[0];

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-xl font-bold text-red-600">{records.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Mesures</p>
        </div>
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-xl font-bold text-gray-800">{avgSys ? `${avgSys}/${avgDia}` : "–"}</p>
          <p className="text-xs text-gray-500 mt-0.5">Moyenne</p>
        </div>
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className={`text-xl font-bold ${crises > 0 ? "text-red-600" : "text-green-600"}`}>{crises}</p>
          <p className="text-xs text-gray-500 mt-0.5">Crises</p>
        </div>
      </div>

      {latest && (() => {
        const s = STATUS_INFO[bpStatus(latest.systolic, latest.diastolic)];
        return (
          <div className={`rounded-2xl border p-3 ${s.bg}`}>
            <p className="text-xs text-gray-500">Dernière mesure</p>
            <p className={`text-2xl font-bold ${s.color}`}>{latest.systolic}/{latest.diastolic} <span className="text-sm font-normal">mmHg</span></p>
            <p className={`text-sm font-semibold ${s.color}`}>{s.label}</p>
          </div>
        );
      })()}

      <button onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm active:opacity-80">
        + Nouvelle mesure
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <p className="font-semibold text-gray-900">Nouvelle mesure</p>

          <div>
            <label className="text-xs text-gray-500 font-medium">Date & heure</label>
            <input type="datetime-local" value={form.recorded_at}
              onChange={e => setForm({ ...form, recorded_at: e.target.value })} className="input mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Systolique (mmHg) *</label>
              <input type="number" placeholder="ex: 120" value={form.systolic}
                onChange={e => setForm({ ...form, systolic: e.target.value })} className="input mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Diastolique (mmHg) *</label>
              <input type="number" placeholder="ex: 80" value={form.diastolic}
                onChange={e => setForm({ ...form, diastolic: e.target.value })} className="input mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Pouls (bpm)</label>
            <input type="number" placeholder="ex: 72" value={form.heart_rate}
              onChange={e => setForm({ ...form, heart_rate: e.target.value })} className="input mt-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Bras</label>
            <div className="flex gap-2 mt-1">
              {([["left","💪 Gauche"],["right","💪 Droit"],["both","Les deux"]] as const).map(([v,l]) => (
                <button key={v} type="button"
                  onClick={() => setForm({ ...form, arm: v })}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-medium transition-all ${form.arm === v ? "border-red-400 bg-red-50 text-red-800" : "border-gray-100 text-gray-600"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Position</label>
            <div className="flex gap-2 mt-1">
              {([["sitting","🪑 Assis"],["standing","🧍 Debout"],["lying","🛏 Allongé"]] as const).map(([v,l]) => (
                <button key={v} type="button"
                  onClick={() => setForm({ ...form, position: v })}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-medium transition-all ${form.position === v ? "border-red-400 bg-red-50 text-red-800" : "border-gray-100 text-gray-600"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Symptômes, médicaments pris..." rows={2} className="input mt-1 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border text-gray-600 text-sm">Annuler</button>
            <button onClick={save} disabled={saving || !form.systolic || !form.diastolic}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* Guide OMS */}
      <div className="bg-gray-50 rounded-2xl border p-4 space-y-1.5">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Guide OMS — Tension artérielle</p>
        {Object.entries(STATUS_INFO).map(([k, v]) => (
          <div key={k} className={`flex justify-between items-center rounded-lg px-3 py-1.5 border ${v.bg}`}>
            <span className={`text-xs font-medium ${v.color}`}>{v.label}</span>
            <span className="text-xs text-gray-500">
              {k === "optimal" ? "< 120/80" : k === "normal" ? "120–129 / < 80" : k === "elevated" ? "130–139 / 80–89" : k === "high1" ? "140–159 / 90–99" : k === "high2" ? "160–179 / 100–109" : "≥ 180 / ≥ 120"}
            </span>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {records.length === 0 && (
          <div className="card text-center py-10 space-y-3">
            <div className="text-5xl">🩺</div>
            <p className="font-semibold text-gray-800">Aucune mesure enregistrée</p>
            <p className="text-sm text-gray-500 leading-relaxed px-4">
              Suis ta tension artérielle régulièrement pour détecter et contrôler l&apos;hypertension.
            </p>
            <button onClick={() => setShowForm(true)}
              className="inline-block bg-red-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
              + Nouvelle mesure
            </button>
          </div>
        )}
        {records.map(r => {
          const s = STATUS_INFO[bpStatus(r.systolic, r.diastolic)];
          const borderHex: Record<string, string> = { optimal: "#22c55e", normal: "#3b82f6", elevated: "#eab308", high1: "#f59e0b", high2: "#f97316", crisis: "#ef4444" };
          const bpKey = bpStatus(r.systolic, r.diastolic);
          const iconBg: Record<string, string> = { optimal: "bg-green-50", normal: "bg-blue-50", elevated: "bg-yellow-50", high1: "bg-amber-50", high2: "bg-orange-50", crisis: "bg-red-50" };
          return (
            <div key={r.id} className="card flex items-start gap-3 border-l-4" style={{ borderLeftColor: borderHex[bpKey] }}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${iconBg[bpKey]}`}>
                🩺
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs text-gray-500">{new Date(r.recorded_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{r.systolic}/{r.diastolic} <span className="text-sm font-normal text-gray-500">mmHg</span></p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>{s.label}</span>
                    {r.heart_rate && <span className="text-xs text-gray-500">❤️ {r.heart_rate} bpm</span>}
                  </div>
                </div>
                {r.arm && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Bras {r.arm === "left" ? "gauche" : r.arm === "right" ? "droit" : "les deux"} · {r.position === "sitting" ? "Assis" : r.position === "standing" ? "Debout" : "Allongé"}
                  </p>
                )}
                {r.notes && <p className="text-xs text-gray-500 italic mt-0.5">{r.notes}</p>}
                <button onClick={() => remove(r.id)} className="text-red-400 text-xs mt-1.5">Supprimer</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
