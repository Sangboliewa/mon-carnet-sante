"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LabResult, LabResultInsert } from "@/lib/supabase/types";

// ─── Référentiel intégré ─────────────────────────────────────────────────────

interface LabRef {
  name: string;
  category: string;
  unit: string;
  refMin: number;
  refMax: number;
  refMinF?: number; // femme
  refMaxF?: number;
  description: string;
}

const LAB_REFS: LabRef[] = [
  // NFS
  { name: "Globules blancs (GB)", category: "NFS", unit: "G/L", refMin: 4, refMax: 10, description: "Cellules de défense immunitaire" },
  { name: "Globules rouges (GR)", category: "NFS", unit: "T/L", refMin: 4.5, refMax: 6.2, refMinF: 4.0, refMaxF: 5.4, description: "Transport d'oxygène" },
  { name: "Hémoglobine", category: "NFS", unit: "g/dL", refMin: 13, refMax: 17, refMinF: 12, refMaxF: 16, description: "Protéine transportant l'oxygène" },
  { name: "Hématocrite", category: "NFS", unit: "%", refMin: 40, refMax: 52, refMinF: 37, refMaxF: 47, description: "Volume occupé par les GR" },
  { name: "Plaquettes", category: "NFS", unit: "G/L", refMin: 150, refMax: 400, description: "Coagulation sanguine" },
  { name: "VGM", category: "NFS", unit: "fL", refMin: 80, refMax: 100, description: "Volume moyen des globules rouges" },
  // Biochimie
  { name: "Glycémie", category: "Biochimie", unit: "g/L", refMin: 0.7, refMax: 1.1, description: "Taux de sucre dans le sang (à jeun)" },
  { name: "Créatinine", category: "Biochimie", unit: "mg/L", refMin: 7, refMax: 13, refMinF: 5, refMaxF: 10, description: "Filtre rénal — éliminé par les reins" },
  { name: "Urée", category: "Biochimie", unit: "g/L", refMin: 0.15, refMax: 0.45, description: "Déchet azoté — fonction rénale" },
  { name: "Acide urique", category: "Biochimie", unit: "mg/L", refMin: 35, refMax: 70, refMinF: 25, refMaxF: 55, description: "Associé à la goutte si élevé" },
  { name: "ASAT (SGOT)", category: "Bilan hépatique", unit: "UI/L", refMin: 0, refMax: 40, description: "Enzyme hépatique et musculaire" },
  { name: "ALAT (SGPT)", category: "Bilan hépatique", unit: "UI/L", refMin: 0, refMax: 40, description: "Enzyme hépatique spécifique" },
  { name: "GGT", category: "Bilan hépatique", unit: "UI/L", refMin: 0, refMax: 50, refMaxF: 35, description: "Marqueur hépatique (alcool, médicaments)" },
  { name: "Bilirubine totale", category: "Bilan hépatique", unit: "mg/L", refMin: 0, refMax: 10, description: "Pigment biliaire — ictère si élevée" },
  // Lipides
  { name: "Cholestérol total", category: "Bilan lipidique", unit: "g/L", refMin: 0, refMax: 2.0, description: "Lipide circulant total" },
  { name: "LDL-cholestérol", category: "Bilan lipidique", unit: "g/L", refMin: 0, refMax: 1.6, description: "« Mauvais » cholestérol" },
  { name: "HDL-cholestérol", category: "Bilan lipidique", unit: "g/L", refMin: 0.4, refMax: 9.9, description: "« Bon » cholestérol — protecteur" },
  { name: "Triglycérides", category: "Bilan lipidique", unit: "g/L", refMin: 0, refMax: 1.5, description: "Graisses sanguines" },
  // Thyroïde
  { name: "TSH", category: "Thyroïde", unit: "mUI/L", refMin: 0.4, refMax: 4.0, description: "Hormone stimulant la thyroïde" },
  { name: "T4 libre", category: "Thyroïde", unit: "pmol/L", refMin: 10, refMax: 25, description: "Hormone thyroïdienne active" },
  // Paludisme (contexte africain)
  { name: "Antigène HRP2 (TDR Palu)", category: "Paludisme", unit: "index", refMin: 0, refMax: 0.99, description: "Positif ≥ 1 : Plasmodium falciparum détecté" },
  { name: "Parasitémie", category: "Paludisme", unit: "para/µL", refMin: 0, refMax: 0, description: "Nombre de parasites — 0 = négatif" },
];

const CATEGORIES = [...new Set(LAB_REFS.map((r) => r.category))];

function statusOf(result: LabResult): "normal" | "low" | "high" | "unknown" {
  if (result.ref_min == null && result.ref_max == null) return "unknown";
  if (result.ref_min != null && result.value < result.ref_min) return "low";
  if (result.ref_max != null && result.value > result.ref_max) return "high";
  return "normal";
}

const STATUS_STYLE: Record<string, string> = {
  normal:  "bg-green-100 text-green-700",
  low:     "bg-blue-100 text-blue-700",
  high:    "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  normal: "Normal", low: "Bas", high: "Élevé", unknown: "—",
};

function today() { return new Date().toISOString().split("T")[0]; }
function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface Props { personId: string; gender: string | null; initialData: LabResult[] }

export default function ResultatsLaboClient({ personId, gender, initialData }: Props) {
  const [items, setItems] = useState<LabResult[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [testDate, setTestDate] = useState(today());
  const [labName, setLabName] = useState("");
  const [selectedRef, setSelectedRef] = useState<LabRef | null>(null);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [value, setValue] = useState("");
  const [refMin, setRefMin] = useState("");
  const [refMax, setRefMax] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function pickRef(ref: LabRef | null) {
    setSelectedRef(ref);
    if (ref) {
      const isFemale = gender === "female";
      setCustomUnit(ref.unit);
      setRefMin(String(isFemale && ref.refMinF != null ? ref.refMinF : ref.refMin));
      setRefMax(String(isFemale && ref.refMaxF != null ? ref.refMaxF : ref.refMax));
      setCustomName(ref.name);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setSaving(true);
    const supabase = createClient();
    const payload: LabResultInsert = {
      person_id: personId,
      test_date: testDate,
      test_name: customName || selectedRef?.name || "Examen",
      category: selectedRef?.category ?? null,
      value: parseFloat(value),
      unit: customUnit,
      ref_min: refMin ? parseFloat(refMin) : null,
      ref_max: refMax ? parseFloat(refMax) : null,
      lab_name: labName || null,
      notes: notes || null,
    };
    const { data } = await supabase.from("lab_results").insert(payload).select().single();
    setSaving(false);
    if (data) {
      setItems((prev) => [data, ...prev]);
      setValue(""); setNotes(""); setSelectedRef(null); setCustomName(""); setCustomUnit(""); setRefMin(""); setRefMax("");
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("lab_results").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  }

  const abnormal = items.filter((i) => statusOf(i) !== "normal" && statusOf(i) !== "unknown");
  const filtered = filterCat === "all" ? items : items.filter((i) => i.category === filterCat);
  const groupedByDate = useMemo(() => {
    const map = new Map<string, LabResult[]>();
    for (const item of filtered) {
      const key = item.test_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Alertes anomalies */}
      {abnormal.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
          <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">⚠️ Valeurs hors norme</p>
          {abnormal.slice(0, 5).map((r) => {
            const s = statusOf(r);
            return (
              <div key={r.id} className="flex justify-between items-center">
                <p className="text-sm text-gray-800">{r.test_name}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[s]}`}>
                  {r.value} {r.unit} ({STATUS_LABEL[s]})
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : "+ Saisir un résultat"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">Examen (sélectionner ou saisir)</label>
            <select className="input-field" value={selectedRef?.name ?? ""} onChange={(e) => {
              const ref = LAB_REFS.find((r) => r.name === e.target.value) ?? null;
              pickRef(ref);
            }}>
              <option value="">— Choisir dans le référentiel —</option>
              {CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {LAB_REFS.filter((r) => r.category === cat).map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedRef && (
              <p className="text-xs text-gray-500 mt-1 italic">{selectedRef.description}</p>
            )}
          </div>
          {!selectedRef && (
            <div>
              <label className="label">Nom de l&apos;examen (manuel)</label>
              <input className="input-field" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="ex : Ferritine" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Résultat *</label>
              <input type="number" step="0.001" required className="input-field" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div>
              <label className="label">Unité</label>
              <input className="input-field" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="g/L" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valeur min normale</label>
              <input type="number" step="0.001" className="input-field" value={refMin} onChange={(e) => setRefMin(e.target.value)} />
            </div>
            <div>
              <label className="label">Valeur max normale</label>
              <input type="number" step="0.001" className="input-field" value={refMax} onChange={(e) => setRefMax(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" required className="input-field" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Laboratoire</label>
              <input className="input-field" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="ex : Labo Pasteur" />
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

      {/* Filtre catégorie */}
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {["all", ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${filterCat === cat ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
              {cat === "all" ? "Tous" : cat}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center text-gray-500 py-8 text-sm">Aucun résultat enregistré.</div>
      )}

      {groupedByDate.map(([date, results]) => (
        <div key={date} className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{fmt(date)}</p>
          {results.map((r) => {
            const s = statusOf(r);
            return (
              <div key={r.id} className="card flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{r.test_name}</p>
                  <p className="text-lg font-bold text-gray-800">{r.value} <span className="text-sm font-normal text-gray-500">{r.unit}</span></p>
                  {r.ref_min != null && r.ref_max != null && (
                    <p className="text-xs text-gray-400">Norme : {r.ref_min} – {r.ref_max} {r.unit}</p>
                  )}
                  {r.lab_name && <p className="text-xs text-gray-400">{r.lab_name}</p>}
                  {r.notes && <p className="text-xs text-gray-500 italic">{r.notes}</p>}
                  <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="text-red-400 text-xs mt-1">
                    {deletingId === r.id ? "…" : "Supprimer"}
                  </button>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${STATUS_STYLE[s]}`}>
                  {STATUS_LABEL[s]}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
