"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

async function pdfToJpeg(file: File): Promise<File> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (page.render as any)({ canvasContext: ctx, viewport }).promise;
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error("PDF render failed")); return; }
      resolve(new File([blob], file.name.replace(/\.pdf$/i, ".jpg"), { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

interface LabResult {
  test_name: string;
  category: string | null;
  value: number | null;
  unit: string | null;
  ref_min: number | null;
  ref_max: number | null;
  interpretation: string | null;
}

interface Treatment {
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
}

interface Maladie {
  condition_name: string;
  status: "active" | "resolved" | null;
  notes: string | null;
}

interface Allergie {
  allergen: string;
  severity: "mild" | "moderate" | "severe" | "life_threatening" | null;
  reaction: string | null;
}

interface ScanResult {
  document_type: string;
  date: string | null;
  medecin: string | null;
  etablissement: string | null;
  traitements: Treatment[];
  resultats_labo: LabResult[];
  maladies: Maladie[];
  allergies: Allergie[];
  consultation: { reason: string | null; diagnosis: string | null; notes: string | null } | null;
  resume: string;
}

interface Props {
  personId: string;
}

export default function ScanClient({ personId }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // Checkboxes for what to save
  const [saveTraitements, setSaveTraitements] = useState(true);
  const [saveLabo, setSaveLabo] = useState(true);
  const [saveMaladies, setSaveMaladies] = useState(true);
  const [saveAllergies, setSaveAllergies] = useState(true);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setSaved(false);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleScan() {
    if (!file) return;
    setScanning(true);
    setError(null);
    try {
      let fileToSend = file;
      if (file.type === "application/pdf") {
        try {
          fileToSend = await pdfToJpeg(file);
        } catch {
          throw new Error(t("Impossible de convertir le PDF. Essayez une image JPEG ou PNG.", "Failed to convert PDF. Try a JPEG or PNG image."));
        }
      }
      const fd = new FormData();
      fd.append("file", fileToSend);
      const res = await fetch("/api/scan-document", { method: "POST", body: fd });
      const text = await res.text();
      if (!text) throw new Error(t("Pas de réponse du serveur. Vérifiez votre connexion.", "No response from server. Check your connection."));
      let json: { error?: string; result?: unknown };
      try { json = JSON.parse(text); } catch { throw new Error(t("Réponse invalide du serveur.", "Invalid server response.")); }
      if (!res.ok) throw new Error(json.error || t("Erreur lors de l'analyse", "Analysis error"));
      setResult(json.result as typeof result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Erreur inconnue", "Unknown error"));
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    const supabase = createClient();
    const date = result.date || new Date().toISOString().slice(0, 10);

    try {
      // Save treatments
      if (saveTraitements && result.traitements.length > 0) {
        for (const t of result.traitements) {
          await supabase.from("treatments").insert({
            person_id: personId,
            medication_name: t.medication_name,
            dosage: t.dosage,
            frequency: t.frequency,
            start_date: date,
            prescribing_doctor: result.medecin,
            notes: [t.notes, t.duration ? `Durée: ${t.duration}` : null].filter(Boolean).join(" — ") || null,
          });
        }
      }

      // Save lab results
      if (saveLabo && result.resultats_labo.length > 0) {
        for (const r of result.resultats_labo) {
          if (!r.test_name) continue;
          await supabase.from("lab_results").insert({
            person_id: personId,
            test_name: r.test_name,
            category: r.category,
            test_date: date,
            value: r.value ?? null,
            unit: r.unit ?? null,
            ref_min: r.ref_min,
            ref_max: r.ref_max,
            lab_name: result.etablissement,
            notes: r.interpretation,
          });
        }
      }

      // Save chronic conditions
      if (saveMaladies && result.maladies.length > 0) {
        for (const m of result.maladies) {
          await supabase.from("chronic_conditions").insert({
            person_id: personId,
            condition_name: m.condition_name,
            status: m.status ?? "active",
            diagnosed_date: date,
            notes: m.notes,
          });
        }
      }

      // Save allergies
      if (saveAllergies && result.allergies.length > 0) {
        for (const a of result.allergies) {
          await supabase.from("allergies").insert({
            person_id: personId,
            allergen: a.allergen,
            severity: a.severity,
            reaction: a.reaction,
            diagnosed_date: date,
          });
        }
      }

      setSaved(true);
    } catch {
      setError(t("Erreur lors de la sauvegarde.", "Save error."));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setSaved(false);
    setError(null);
  }

  const docTypeLabel: Record<string, string> = {
    ordonnance: t("Ordonnance", "Prescription"),
    resultat_labo: t("Résultat de laboratoire", "Lab Result"),
    compte_rendu: t("Compte-rendu médical", "Medical Report"),
    autre: t("Document médical", "Medical Document"),
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Upload zone */}
      {!result && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-sm text-gray-500 text-center">
            {t("Photographiez ou importez une ordonnance, un résultat d'examen ou un compte-rendu (JPEG, PNG, PDF)", "Photograph or import a prescription, exam result or medical report (JPEG, PNG, PDF)")}
          </p>

          {file && preview && (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              {file.type === "application/pdf" ? (
                <div className="flex flex-col items-center justify-center py-8 bg-gray-50 text-gray-600 gap-2">
                  <span className="text-4xl">📄</span>
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-400">{t("PDF — sera converti en image avant analyse", "PDF — will be converted to image before analysis")}</span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview} alt={t("Document scanné", "Scanned document")} className="w-full max-h-64 object-contain bg-gray-50" />
              )}
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-gray-500 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => cameraInput.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium"
            >
              📷 {t("Caméra", "Camera")}
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium"
            >
              📁 {t("Importer", "Import")}
            </button>
          </div>

          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden" onChange={handleFileChange} />

          {file && (
            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-60"
            >
              {scanning ? t("Analyse en cours…", "Analyzing…") : t("🔍 Analyser le document", "🔍 Analyze document")}
            </button>
          )}

          {scanning && (
            <div className="text-center text-sm text-gray-500 animate-pulse">
              {t("Claude analyse votre document…", "Claude is analyzing your document…")}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !saved && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                {docTypeLabel[result.document_type] ?? "Document"}
              </span>
              {result.date && <span className="text-xs text-blue-600">{result.date}</span>}
            </div>
            <p className="text-sm text-blue-800 mt-1">{result.resume}</p>
            {result.medecin && <p className="text-xs text-blue-600 mt-1">Dr {result.medecin}</p>}
            {result.etablissement && <p className="text-xs text-blue-600">{result.etablissement}</p>}
          </div>

          {/* Traitements */}
          {result.traitements.length > 0 && (
            <div className="card border-l-4 border-l-blue-400">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={saveTraitements} onChange={e => setSaveTraitements(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="font-semibold text-gray-800">💊 {t("Traitements", "Treatments")} ({result.traitements.length})</span>
              </label>
              <ul className="space-y-2">
                {result.traitements.map((t, i) => (
                  <li key={i} className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="font-medium">{t.medication_name}</span>
                    {t.dosage && <span className="text-gray-500"> — {t.dosage}</span>}
                    {t.frequency && <span className="text-gray-500">, {t.frequency}</span>}
                    {t.duration && <span className="text-gray-400 text-xs"> ({t.duration})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Résultats labo */}
          {result.resultats_labo.length > 0 && (
            <div className="card border-l-4 border-l-purple-400">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={saveLabo} onChange={e => setSaveLabo(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                <span className="font-semibold text-gray-800">🧪 {t("Résultats labo", "Lab Results")} ({result.resultats_labo.length})</span>
              </label>
              <ul className="space-y-2">
                {result.resultats_labo.map((r, i) => (
                  <li key={i} className="text-sm bg-gray-50 rounded-xl px-3 py-2 flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-800">{r.test_name}</span>
                      {r.category && <span className="text-xs text-gray-400 ml-1">({r.category})</span>}
                    </div>
                    <div className="text-right">
                      {r.value !== null && (
                        <span className={`font-semibold ${
                          r.interpretation === "Elevé" ? "text-red-600" :
                          r.interpretation === "Bas" ? "text-blue-600" : "text-green-600"
                        }`}>
                          {r.value} {r.unit}
                        </span>
                      )}
                      {(r.ref_min !== null || r.ref_max !== null) && (
                        <div className="text-xs text-gray-400">
                          {t("Réf", "Ref")}: {r.ref_min ?? "?"} – {r.ref_max ?? "?"}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Maladies */}
          {result.maladies.length > 0 && (
            <div className="card border-l-4 border-l-orange-400">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={saveMaladies} onChange={e => setSaveMaladies(e.target.checked)} className="w-4 h-4 accent-orange-600" />
                <span className="font-semibold text-gray-800">🏥 {t("Diagnostics", "Diagnoses")} ({result.maladies.length})</span>
              </label>
              <ul className="space-y-2">
                {result.maladies.map((m, i) => (
                  <li key={i} className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="font-medium">{m.condition_name}</span>
                    {m.notes && <span className="text-gray-500"> — {m.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Allergies */}
          {result.allergies.length > 0 && (
            <div className="card border-l-4 border-l-red-400">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={saveAllergies} onChange={e => setSaveAllergies(e.target.checked)} className="w-4 h-4 accent-red-600" />
                <span className="font-semibold text-gray-800">⚠️ {t("Allergies", "Allergies")} ({result.allergies.length})</span>
              </label>
              <ul className="space-y-2">
                {result.allergies.map((a, i) => (
                  <li key={i} className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="font-medium">{a.allergen}</span>
                    {a.reaction && <span className="text-gray-500"> — {a.reaction}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No data */}
          {result.traitements.length === 0 && result.resultats_labo.length === 0 &&
           result.maladies.length === 0 && result.allergies.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 text-center">
              {t("Aucune donnée extractible détectée dans ce document.", "No extractable data detected in this document.")}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium">
              {t("Recommencer", "Start over")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (result.traitements.length === 0 && result.resultats_labo.length === 0 && result.maladies.length === 0 && result.allergies.length === 0)}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {saving ? t("Sauvegarde…", "Saving…") : t("✅ Enregistrer", "✅ Save")}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p className="font-semibold text-green-800">{t("Données enregistrées avec succès !", "Data saved successfully!")}</p>
          <p className="text-sm text-green-700">
            {t("Les informations ont été ajoutées à votre carnet de santé.", "The information has been added to your health record.")}
          </p>
          <button onClick={reset} className="mt-2 px-6 py-2 rounded-xl bg-green-600 text-white text-sm font-medium">
            {t("Scanner un autre document", "Scan another document")}
          </button>
        </div>
      )}
    </div>
  );
}
