"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MalariaEpisodeRow, MalariaEpisodeInsert } from "@/lib/supabase/types";

const BLANK: Omit<MalariaEpisodeInsert, "person_id"> = {
  episode_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  fever: false,
  fever_temp: null,
  chills: false,
  headache: false,
  vomiting: false,
  fatigue: false,
  joint_pain: false,
  sweating: false,
  test_type: null,
  test_result: null,
  parasite_species: null,
  treatment_name: null,
  treatment_other: null,
  treatment_start: null,
  treatment_end: null,
  treatment_completed: false,
  hospitalized: false,
  hospital_name: null,
  severity: "simple",
  outcome: null,
  notes: null,
};

const SYMPTOMES = [
  { key: "fever", label: "Fièvre" },
  { key: "chills", label: "Frissons" },
  { key: "headache", label: "Maux de tête" },
  { key: "vomiting", label: "Vomissements" },
  { key: "fatigue", label: "Fatigue intense" },
  { key: "joint_pain", label: "Douleurs articulaires" },
  { key: "sweating", label: "Sueurs" },
] as const;

const TEST_TYPES = ["TDR", "Goutte_Epaisse", "Frottis", "PCR", "Aucun"];
const TEST_LABELS: Record<string, string> = {
  TDR: "TDR (Test Rapide)",
  Goutte_Epaisse: "Goutte Épaisse",
  Frottis: "Frottis sanguin",
  PCR: "PCR",
  Aucun: "Aucun test",
};
const TRAITEMENTS = ["Coartem", "Artemether-Lumefantrine", "Artésunate IV", "Quinine", "Autre"];
const ESPECES = [
  { val: "P_falciparum", label: "P. falciparum" },
  { val: "P_vivax", label: "P. vivax" },
  { val: "P_malariae", label: "P. malariae" },
  { val: "P_ovale", label: "P. ovale" },
  { val: "inconnu", label: "Espèce inconnue" },
];

function severityBadge(s: string | null) {
  if (s === "grave") return "bg-red-100 text-red-700";
  if (s === "cerebral") return "bg-red-200 text-red-900 font-bold";
  return "bg-yellow-100 text-yellow-700";
}

function outcomeBadge(o: string | null) {
  if (o === "gueri") return "✅ Guéri";
  if (o === "complications") return "⚠️ Complications";
  if (o === "hospitalise") return "🏥 Hospitalisé";
  return "";
}

interface Props {
  personId: string;
  initialData: MalariaEpisodeRow[];
}

export default function PaludismeClient({ personId, initialData }: Props) {
  const [items, setItems] = useState<MalariaEpisodeRow[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<MalariaEpisodeInsert, "person_id">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function set(field: string, val: unknown) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("malaria_episodes")
      .insert({ ...form, person_id: personId })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setItems(prev => [data as MalariaEpisodeRow, ...prev]);
      setForm(BLANK);
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("malaria_episodes").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    setDeletingId(null);
  }

  const totalEpisodes = items.length;
  const graves = items.filter(i => i.severity === "grave" || i.severity === "cerebral").length;

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{totalEpisodes}</p>
          <p className="text-xs text-orange-600">Épisodes</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{graves}</p>
          <p className="text-xs text-red-600">Graves</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">
            {items.filter(i => i.outcome === "gueri").length}
          </p>
          <p className="text-xs text-green-600">Guérisons</p>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowForm(v => !v)}
        className="w-full py-3 rounded-xl bg-orange-600 text-white font-semibold text-sm"
      >
        {showForm ? "Annuler" : "+ Nouvel épisode"}
      </button>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <p className="font-semibold text-gray-800">Nouvel épisode de paludisme</p>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Date début *</label>
              <input type="date" required value={form.episode_date as string}
                onChange={e => set("episode_date", e.target.value)}
                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Date fin</label>
              <input type="date" value={form.end_date ?? ""}
                onChange={e => set("end_date", e.target.value || null)}
                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Sévérité */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Sévérité</label>
            <div className="flex gap-2">
              {[["simple","Simple"],["grave","Grave"],["cerebral","Cérébral"]].map(([v,l]) => (
                <button key={v} type="button"
                  onClick={() => set("severity", v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
                    form.severity === v
                      ? v === "simple" ? "bg-yellow-500 text-white border-yellow-500"
                        : v === "grave" ? "bg-red-500 text-white border-red-500"
                        : "bg-red-800 text-white border-red-800"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Symptômes */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">Symptômes</label>
            <div className="grid grid-cols-2 gap-2">
              {SYMPTOMES.map(s => (
                <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox"
                    checked={!!form[s.key as keyof typeof form]}
                    onChange={e => set(s.key, e.target.checked)}
                    className="w-4 h-4 accent-orange-500" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          {/* Température */}
          {form.fever && (
            <div>
              <label className="text-xs text-gray-500 font-medium">Température (°C)</label>
              <input type="number" step="0.1" min="35" max="45"
                value={form.fever_temp ?? ""}
                onChange={e => set("fever_temp", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="ex: 39.5"
                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            </div>
          )}

          {/* Test */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Type de test</label>
            <select value={form.test_type ?? ""}
              onChange={e => set("test_type", e.target.value || null)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white">
              <option value="">— Sélectionner —</option>
              {TEST_TYPES.map(t => <option key={t} value={t}>{TEST_LABELS[t]}</option>)}
            </select>
          </div>

          {/* Résultat test */}
          {form.test_type && form.test_type !== "Aucun" && (
            <div className="flex gap-2">
              {[["positif","Positif ✅"],["negatif","Négatif ❌"],["non_fait","Non fait"]].map(([v,l]) => (
                <button key={v} type="button"
                  onClick={() => set("test_result", v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
                    form.test_result === v
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >{l}</button>
              ))}
            </div>
          )}

          {/* Espèce */}
          {form.test_result === "positif" && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Espèce parasitaire</label>
              <select value={form.parasite_species ?? ""}
                onChange={e => set("parasite_species", e.target.value || null)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="">— Inconnue —</option>
                {ESPECES.map(e => <option key={e.val} value={e.val}>{e.label}</option>)}
              </select>
            </div>
          )}

          {/* Traitement */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Traitement</label>
            <select value={form.treatment_name ?? ""}
              onChange={e => set("treatment_name", e.target.value || null)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white">
              <option value="">— Sélectionner —</option>
              {TRAITEMENTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {form.treatment_name === "Autre" && (
            <input type="text" placeholder="Préciser le traitement"
              value={form.treatment_other ?? ""}
              onChange={e => set("treatment_other", e.target.value || null)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Début traitement</label>
              <input type="date" value={form.treatment_start ?? ""}
                onChange={e => set("treatment_start", e.target.value || null)}
                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Fin traitement</label>
              <input type="date" value={form.treatment_end ?? ""}
                onChange={e => set("treatment_end", e.target.value || null)}
                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Hospitalisation */}
          <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-3 py-2">
            <input type="checkbox" checked={!!form.hospitalized}
              onChange={e => set("hospitalized", e.target.checked)}
              className="w-4 h-4 accent-orange-500" />
            <span className="text-sm text-gray-700">Hospitalisation requise</span>
          </label>

          {form.hospitalized && (
            <input type="text" placeholder="Nom de l'établissement"
              value={form.hospital_name ?? ""}
              onChange={e => set("hospital_name", e.target.value || null)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          )}

          {/* Issue */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Issue</label>
            <div className="grid grid-cols-2 gap-2">
              {[["gueri","✅ Guéri"],["hospitalise","🏥 Hospitalisé"],["complications","⚠️ Complications"]].map(([v,l]) => (
                <button key={v} type="button"
                  onClick={() => set("outcome", v)}
                  className={`py-2 rounded-xl text-sm font-medium border ${
                    form.outcome === v
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Notes</label>
            <textarea rows={2} value={form.notes ?? ""}
              onChange={e => set("notes", e.target.value || null)}
              placeholder="Observations, complications, contexte…"
              className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-orange-600 text-white font-semibold text-sm disabled:opacity-60">
            {saving ? "Enregistrement…" : "Enregistrer l'épisode"}
          </button>
        </form>
      )}

      {/* Liste */}
      {items.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">🦟</p>
          <p className="text-sm">Aucun épisode enregistré</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map(ep => {
          const symptCount = [ep.fever, ep.chills, ep.headache, ep.vomiting, ep.fatigue, ep.joint_pain, ep.sweating].filter(Boolean).length;
          return (
            <div key={ep.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{ep.episode_date}</p>
                  {ep.end_date && <p className="text-xs text-gray-500">→ {ep.end_date}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge(ep.severity)}`}>
                  {ep.severity === "cerebral" ? "Cérébral" : ep.severity === "grave" ? "Grave" : "Simple"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {ep.fever && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  Fièvre{ep.fever_temp ? ` ${ep.fever_temp}°C` : ""}
                </span>}
                {ep.chills && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Frissons</span>}
                {ep.headache && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Maux de tête</span>}
                {ep.vomiting && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Vomissements</span>}
                {ep.fatigue && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Fatigue</span>}
                {symptCount === 0 && <span className="text-xs text-gray-400">Aucun symptôme enregistré</span>}
              </div>

              <div className="flex gap-2 text-xs text-gray-600 flex-wrap">
                {ep.test_type && <span>🔬 {TEST_LABELS[ep.test_type] ?? ep.test_type} : <strong>{ep.test_result ?? "—"}</strong></span>}
                {ep.parasite_species && <span>• {ESPECES.find(e => e.val === ep.parasite_species)?.label ?? ep.parasite_species}</span>}
              </div>

              {ep.treatment_name && (
                <p className="text-sm text-blue-700">
                  💊 {ep.treatment_name === "Autre" ? ep.treatment_other : ep.treatment_name}
                  {ep.treatment_start && <span className="text-gray-500 text-xs"> ({ep.treatment_start})</span>}
                </p>
              )}

              {ep.hospitalized && (
                <p className="text-xs text-red-600">🏥 Hospitalisé{ep.hospital_name ? ` — ${ep.hospital_name}` : ""}</p>
              )}

              {ep.outcome && <p className="text-sm">{outcomeBadge(ep.outcome)}</p>}
              {ep.notes && <p className="text-xs text-gray-500 italic">{ep.notes}</p>}

              <button
                onClick={() => handleDelete(ep.id)}
                disabled={deletingId === ep.id}
                className="text-xs text-red-400 hover:text-red-600 pt-1"
              >
                {deletingId === ep.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
