"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DrepaRecord {
  id: string;
  recorded_at: string;
  type: string;
  pain_level: number | null;
  pain_locations: string[] | null;
  hemoglobin: number | null;
  transfusion_volume: number | null;
  trigger_factors: string[] | null;
  hospitalized: boolean;
  duration_days: number | null;
  treatment_given: string | null;
  notes: string | null;
}

interface Props { personId: string; initial: DrepaRecord[]; }

const TYPE_LABELS: Record<string, string> = {
  crisis: "Crise vaso-occlusive",
  transfusion: "Transfusion",
  hospitalization: "Hospitalisation",
  consultation: "Consultation",
  lab_result: "Résultat labo",
};

const TYPE_ICONS: Record<string, string> = {
  crisis: "⚡", transfusion: "🩸", hospitalization: "🏥", consultation: "👨‍⚕️", lab_result: "🔬",
};

const PAIN_LOCATIONS = ["Thorax", "Articulations", "Abdomen", "Tête", "Dos", "Membres"];
const TRIGGERS = ["Froid", "Déshydratation", "Infection", "Stress", "Altitude", "Effort physique"];

export default function DrepaClient({ personId, initial }: Props) {
  const [records, setRecords] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().slice(0, 16),
    type: "crisis",
    pain_level: "",
    pain_locations: [] as string[],
    hemoglobin: "",
    transfusion_volume: "",
    trigger_factors: [] as string[],
    hospitalized: false,
    duration_days: "",
    treatment_given: "",
    notes: "",
  });

  const supabase = createClient();

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  async function save() {
    setSaving(true);
    const { data, error } = await supabase.from("drepanocytose_records").insert({
      person_id: personId,
      recorded_at: form.recorded_at,
      type: form.type,
      pain_level: form.pain_level ? parseInt(form.pain_level) : null,
      pain_locations: form.pain_locations.length ? form.pain_locations : null,
      hemoglobin: form.hemoglobin ? parseFloat(form.hemoglobin) : null,
      transfusion_volume: form.transfusion_volume ? parseInt(form.transfusion_volume) : null,
      trigger_factors: form.trigger_factors.length ? form.trigger_factors : null,
      hospitalized: form.hospitalized,
      duration_days: form.duration_days ? parseInt(form.duration_days) : null,
      treatment_given: form.treatment_given || null,
      notes: form.notes || null,
    }).select().single();
    if (!error && data) {
      setRecords([data as DrepaRecord, ...records]);
      setShowForm(false);
      setForm({ recorded_at: new Date().toISOString().slice(0, 16), type: "crisis", pain_level: "", pain_locations: [], hemoglobin: "", transfusion_volume: "", trigger_factors: [], hospitalized: false, duration_days: "", treatment_given: "", notes: "" });
    }
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from("drepanocytose_records").delete().eq("id", id);
    setRecords(records.filter(r => r.id !== id));
  }

  const crises = records.filter(r => r.type === "crisis");
  const transfusions = records.filter(r => r.type === "transfusion");
  const hospi = records.filter(r => r.hospitalized);
  const lastHb = records.find(r => r.hemoglobin)?.hemoglobin;

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-2xl border p-2.5 text-center">
          <p className="text-xl font-bold text-purple-600">{crises.length}</p>
          <p className="text-xs text-gray-500">Crises</p>
        </div>
        <div className="bg-white rounded-2xl border p-2.5 text-center">
          <p className="text-xl font-bold text-red-600">{transfusions.length}</p>
          <p className="text-xs text-gray-500">Transfu.</p>
        </div>
        <div className="bg-white rounded-2xl border p-2.5 text-center">
          <p className="text-xl font-bold text-orange-600">{hospi.length}</p>
          <p className="text-xs text-gray-500">Hospit.</p>
        </div>
        <div className="bg-white rounded-2xl border p-2.5 text-center">
          <p className={`text-xl font-bold ${lastHb && lastHb < 8 ? "text-red-600" : "text-green-600"}`}>
            {lastHb ? `${lastHb}` : "–"}
          </p>
          <p className="text-xs text-gray-500">Hb g/dL</p>
        </div>
      </div>

      {lastHb && lastHb < 8 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
          <p className="text-sm text-red-700 font-medium">⚠️ Hémoglobine basse : {lastHb} g/dL (norme: 12–17 g/dL)</p>
        </div>
      )}

      <button onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl bg-purple-600 text-white font-semibold text-sm active:opacity-80">
        + Nouvel événement
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <p className="font-semibold text-gray-900">Nouvel événement</p>

          <div>
            <label className="text-xs text-gray-500 font-medium">Date & heure</label>
            <input type="datetime-local" value={form.recorded_at}
              onChange={e => setForm({ ...form, recorded_at: e.target.value })} className="input mt-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Type d'événement</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <button key={v} onClick={() => setForm({ ...form, type: v })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${form.type === v ? "border-purple-400 bg-purple-50 text-purple-700 font-semibold" : "border-gray-200 text-gray-600"}`}>
                  <span>{TYPE_ICONS[v]}</span>{l}
                </button>
              ))}
            </div>
          </div>

          {form.type === "crisis" && (
            <>
              <div>
                <label className="text-xs text-gray-500 font-medium">Intensité douleur (0–10)</label>
                <input type="range" min="0" max="10" value={form.pain_level || 0}
                  onChange={e => setForm({ ...form, pain_level: e.target.value })}
                  className="w-full mt-1 accent-purple-600" />
                <p className="text-center text-lg font-bold text-purple-600">{form.pain_level || 0}/10</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Localisation douleur</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PAIN_LOCATIONS.map(loc => (
                    <button key={loc} onClick={() => setForm({ ...form, pain_locations: toggleArr(form.pain_locations, loc) })}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${form.pain_locations.includes(loc) ? "bg-purple-100 border-purple-300 text-purple-700 font-semibold" : "border-gray-200 text-gray-500"}`}>
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Facteurs déclenchants</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TRIGGERS.map(t => (
                    <button key={t} onClick={() => setForm({ ...form, trigger_factors: toggleArr(form.trigger_factors, t) })}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${form.trigger_factors.includes(t) ? "bg-orange-100 border-orange-300 text-orange-700 font-semibold" : "border-gray-200 text-gray-500"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Durée (jours)</label>
                <input type="number" placeholder="ex: 3" value={form.duration_days}
                  onChange={e => setForm({ ...form, duration_days: e.target.value })} className="input mt-1" />
              </div>
            </>
          )}

          {form.type === "transfusion" && (
            <div>
              <label className="text-xs text-gray-500 font-medium">Volume transfusé (mL)</label>
              <input type="number" placeholder="ex: 300" value={form.transfusion_volume}
                onChange={e => setForm({ ...form, transfusion_volume: e.target.value })} className="input mt-1" />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-medium">Hémoglobine (g/dL)</label>
            <input type="number" step="0.1" placeholder="ex: 9.5" value={form.hemoglobin}
              onChange={e => setForm({ ...form, hemoglobin: e.target.value })} className="input mt-1" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.hospitalized}
              onChange={e => setForm({ ...form, hospitalized: e.target.checked })}
              className="w-4 h-4 accent-purple-600" />
            <span className="text-sm text-gray-700">Hospitalisation</span>
          </label>

          <div>
            <label className="text-xs text-gray-500 font-medium">Traitement reçu</label>
            <input type="text" placeholder="ex: Morphine, Hydroxyurée..." value={form.treatment_given}
              onChange={e => setForm({ ...form, treatment_given: e.target.value })} className="input mt-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} className="input mt-1 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border text-gray-600 text-sm">Annuler</button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {records.length === 0 && (
          <div className="card text-center py-10 space-y-3">
            <div className="text-5xl">⚡</div>
            <p className="font-semibold text-gray-800">Aucun événement enregistré</p>
            <p className="text-sm text-gray-500 leading-relaxed px-4">
              Consigne tes crises, transfusions et consultations pour un suivi complet de ta drépanocytose.
            </p>
            <button onClick={() => setShowForm(true)}
              className="inline-block bg-purple-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
              + Nouvel événement
            </button>
          </div>
        )}
        {(() => {
          const TYPE_BORDER: Record<string, string> = {
            crisis: "border-l-purple-500", transfusion: "border-l-red-500",
            hospitalization: "border-l-orange-500", consultation: "border-l-blue-500", lab_result: "border-l-teal-500",
          };
          const TYPE_BG: Record<string, string> = {
            crisis: "bg-purple-50", transfusion: "bg-red-50",
            hospitalization: "bg-orange-50", consultation: "bg-blue-50", lab_result: "bg-teal-50",
          };
          return records.map(r => (
          <div key={r.id} className={`card flex items-start gap-3 border-l-4 ${TYPE_BORDER[r.type] ?? "border-l-gray-200"}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${TYPE_BG[r.type] ?? "bg-gray-50"}`}>
              {TYPE_ICONS[r.type]}
            </div>
            <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500">{new Date(r.recorded_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <p className="font-semibold text-gray-900 mt-0.5">{TYPE_LABELS[r.type]}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.hospitalized && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Hospitalisé</span>}
                <button onClick={() => remove(r.id)} className="text-gray-300 text-lg">×</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-2">
              {r.pain_level !== null && (
                <div>
                  <p className="text-xs text-gray-500">Douleur</p>
                  <p className={`text-lg font-bold ${r.pain_level >= 7 ? "text-red-600" : r.pain_level >= 4 ? "text-amber-600" : "text-green-600"}`}>
                    {r.pain_level}/10
                  </p>
                </div>
              )}
              {r.hemoglobin && (
                <div>
                  <p className="text-xs text-gray-500">Hémoglobine</p>
                  <p className={`text-lg font-bold ${r.hemoglobin < 8 ? "text-red-600" : "text-green-600"}`}>{r.hemoglobin} <span className="text-xs font-normal">g/dL</span></p>
                </div>
              )}
              {r.transfusion_volume && (
                <div>
                  <p className="text-xs text-gray-500">Volume</p>
                  <p className="text-lg font-bold">{r.transfusion_volume} <span className="text-xs font-normal">mL</span></p>
                </div>
              )}
              {r.duration_days && (
                <div>
                  <p className="text-xs text-gray-500">Durée</p>
                  <p className="text-lg font-bold">{r.duration_days}j</p>
                </div>
              )}
            </div>

            {r.pain_locations && r.pain_locations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {r.pain_locations.map((l, i) => <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{l}</span>)}
              </div>
            )}
            {r.trigger_factors && r.trigger_factors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {r.trigger_factors.map((t, i) => <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">⚡ {t}</span>)}
              </div>
            )}
            {r.treatment_given && <p className="text-xs text-gray-600 mt-1">💊 {r.treatment_given}</p>}
            {r.notes && <p className="text-sm text-gray-600 mt-1 italic">{r.notes}</p>}
            </div>
          </div>
          ));
        })()}
      </div>
    </div>
  );
}
