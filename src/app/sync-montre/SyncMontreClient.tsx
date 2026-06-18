"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  personId: string;
  personName: string;
}

type ImportRow = {
  date: string;
  steps?: number;
  calories?: number;
  distance_km?: number;
  duration_min?: number;
  activity_type?: string;
  sleep_hours?: number;
  sleep_quality?: number;
  heart_rate?: number;
  weight_kg?: number;
};

const SUPPORTED_APPS = [
  { name: "Samsung Health", icon: "🌀", format: "CSV", instructions: "Samsung Health → ⋮ → Paramètres → Télécharger mes données → sélectionner Activités + Sommeil → Télécharger" },
  { name: "Garmin Connect", icon: "⌚", format: "CSV", instructions: "Garmin Connect → Menu → Paramètres → Exporter vos données → Activities.csv" },
  { name: "Google Fit", icon: "🏃", format: "JSON", instructions: "Google Takeout → takeout.google.com → Sélectionner Fit → Télécharger" },
  { name: "Fitbit", icon: "💪", format: "CSV", instructions: "Fitbit → Paramètres compte → Exporter les données du compte" },
  { name: "Xiaomi Health", icon: "📱", format: "CSV", instructions: "Mi Fitness → Profil → Vie privée → Exporter données santé" },
  { name: "Huawei Health", icon: "📊", format: "CSV", instructions: "Huawei Santé → Moi → Paramètres → Confidentialité → Exporter données" },
];

function parseSamsungCSV(text: string): ImportRow[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
    const row: ImportRow = { date: "" };
    headers.forEach((h, i) => {
      const v = cols[i];
      if (h.includes("date") || h.includes("start_time")) row.date = v?.split(" ")[0] ?? v;
      if (h.includes("step") || h.includes("pas")) row.steps = parseInt(v) || undefined;
      if (h.includes("calorie")) row.calories = parseInt(v) || undefined;
      if (h.includes("distance")) row.distance_km = parseFloat(v) || undefined;
      if (h.includes("duration") || h.includes("durée")) row.duration_min = Math.round((parseFloat(v) || 0) / 60) || undefined;
      if (h.includes("activity") || h.includes("activité")) row.activity_type = v?.toLowerCase();
      if (h.includes("sleep") || h.includes("sommeil")) row.sleep_hours = parseFloat(v) || undefined;
      if (h.includes("weight") || h.includes("poids")) row.weight_kg = parseFloat(v) || undefined;
    });
    return row;
  }).filter(r => r.date && r.date.match(/\d{4}-\d{2}-\d{2}/));
}

function mapActivityType(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("walk") || r.includes("march")) return "marche";
  if (r.includes("run") || r.includes("cours")) return "course";
  if (r.includes("cycl") || r.includes("velo") || r.includes("vélo") || r.includes("bike")) return "velo";
  if (r.includes("swim") || r.includes("nata")) return "natation";
  if (r.includes("gym") || r.includes("weight") || r.includes("muscl")) return "gym";
  if (r.includes("yoga")) return "yoga";
  if (r.includes("football") || r.includes("soccer")) return "football";
  if (r.includes("dance") || r.includes("danse")) return "danse";
  return "autre";
}

export default function SyncMontreClient({ personId, personName }: Props) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ activities: number; sleeps: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsed([]);
    setImportResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const rows = parseSamsungCSV(text);
        if (rows.length === 0) {
          setError("Aucune donnée reconnue dans ce fichier. Vérifie le format CSV.");
          return;
        }
        setParsed(rows);
      } catch {
        setError("Impossible de lire ce fichier. Format non supporté.");
      }
    };
    reader.readAsText(f, "UTF-8");
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    setImporting(true);
    setError(null);
    const supabase = createClient();
    let activities = 0, sleeps = 0, errors = 0;

    for (const row of parsed) {
      // Import activité si steps ou calories ou durée
      if (row.steps || row.calories || row.duration_min) {
        const { error: err } = await supabase.from("activity_logs").insert({
          person_id: personId,
          log_date: row.date,
          activity_type: row.activity_type ? mapActivityType(row.activity_type) : "marche",
          duration_min: row.duration_min ?? 30,
          calories_burned: row.calories ?? null,
          steps: row.steps ?? null,
          distance_km: row.distance_km ?? null,
          intensity: "modere",
          notes: "Importé depuis " + (selectedApp ?? "appareil"),
        });
        if (err) errors++; else activities++;
      }

      // Import sommeil si sleep_hours
      if (row.sleep_hours && row.sleep_hours > 0) {
        const durationMin = Math.round(row.sleep_hours * 60);
        const { error: err } = await supabase.from("sleep_logs").insert({
          person_id: personId,
          log_date: row.date,
          duration_min: durationMin,
          quality: row.sleep_quality ?? 3,
          notes: "Importé depuis " + (selectedApp ?? "appareil"),
        });
        if (err) errors++; else sleeps++;
      }
    }

    setImportResult({ activities, sleeps, errors });
    setImporting(false);
    setParsed([]);
    setFile(null);
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Info banner */}
      <div className="card bg-purple-50 border-purple-200">
        <p className="text-sm text-purple-800">
          <span className="font-semibold">Bonjour {personName} 👋</span><br />
          Importez vos données de montre connectée directement dans votre carnet santé.
          Vos activités et données de sommeil seront synchronisées automatiquement.
        </p>
      </div>

      {/* Résultat import */}
      {importResult && (
        <div className="card bg-green-50 border-green-200 space-y-1">
          <p className="text-sm font-bold text-green-800">✅ Import terminé !</p>
          <p className="text-sm text-green-700">🏃 {importResult.activities} activité(s) importée(s)</p>
          <p className="text-sm text-green-700">😴 {importResult.sleeps} nuit(s) importée(s)</p>
          {importResult.errors > 0 && (
            <p className="text-sm text-amber-600">⚠️ {importResult.errors} entrée(s) ignorée(s)</p>
          )}
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Sélection application */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Votre application santé
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_APPS.map((app) => (
            <button
              key={app.name}
              onClick={() => setSelectedApp(app.name)}
              className={`card flex flex-col items-center gap-2 py-3 border-2 transition-all ${
                selectedApp === app.name ? "border-purple-500 bg-purple-50" : "border-gray-100"
              }`}
            >
              <span className="text-3xl">{app.icon}</span>
              <span className="text-xs font-semibold text-gray-700 text-center">{app.name}</span>
              <span className="text-xs text-gray-400">{app.format}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {selectedApp && (
        <div className="card border-purple-200 bg-purple-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-purple-900">
              {SUPPORTED_APPS.find(a => a.name === selectedApp)?.icon} Comment exporter depuis {selectedApp}
            </p>
            <button
              onClick={() => setShowInstructions(showInstructions === selectedApp ? null : selectedApp)}
              className="text-xs text-purple-600 font-medium"
            >
              {showInstructions === selectedApp ? "Masquer" : "Voir comment →"}
            </button>
          </div>
          {showInstructions === selectedApp && (
            <p className="text-xs text-purple-800 leading-relaxed bg-white rounded-xl px-3 py-2 border border-purple-100">
              {SUPPORTED_APPS.find(a => a.name === selectedApp)?.instructions}
            </p>
          )}

          {/* Upload fichier */}
          <div>
            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-purple-300 rounded-xl py-6 text-center bg-white hover:bg-purple-50 transition-colors">
                <p className="text-2xl mb-1">📂</p>
                <p className="text-sm font-medium text-purple-700">
                  {file ? file.name : `Sélectionner le fichier ${SUPPORTED_APPS.find(a => a.name === selectedApp)?.format}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">Tap pour parcourir</p>
              </div>
              <input
                type="file"
                accept=".csv,.json,.txt"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          </div>
        </div>
      )}

      {/* Aperçu données parsées */}
      {parsed.length > 0 && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            📊 {parsed.length} entrée(s) détectée(s) — aperçu :
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {parsed.slice(0, 10).map((row, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-gray-50">
                <span className="font-medium">{row.date}</span>
                <div className="flex gap-2">
                  {row.steps && <span>👟 {row.steps.toLocaleString()}</span>}
                  {row.calories && <span>🔥 {row.calories} kcal</span>}
                  {row.sleep_hours && <span>😴 {row.sleep_hours}h</span>}
                  {row.weight_kg && <span>⚖️ {row.weight_kg}kg</span>}
                </div>
              </div>
            ))}
            {parsed.length > 10 && (
              <p className="text-xs text-center text-gray-400 pt-1">+ {parsed.length - 10} entrées supplémentaires</p>
            )}
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary"
          >
            {importing ? "Import en cours…" : `Importer ${parsed.length} entrées dans Mon Carnet`}
          </button>
        </div>
      )}

      {/* Séparateur */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">ou</span></div>
      </div>

      {/* Saisie manuelle rapide */}
      <div className="card space-y-2">
        <p className="text-sm font-semibold text-gray-900">📲 Données depuis votre montre aujourd'hui</p>
        <p className="text-xs text-gray-500">Saisissez directement le résumé affiché sur votre montre</p>
        <div className="flex gap-2 mt-2">
          <a href="/activite" className="flex-1 text-center py-3 rounded-xl bg-health-blue-light text-health-blue text-sm font-semibold">
            🏃 Activité
          </a>
          <a href="/sommeil" className="flex-1 text-center py-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold">
            😴 Sommeil
          </a>
        </div>
      </div>

      {/* Note technique */}
      <div className="card bg-gray-50 border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          💡 <span className="font-medium">Synchronisation automatique</span> — Une intégration native directe avec les montres (Bluetooth BLE)
          est prévue dans une prochaine version de l'application Android.
        </p>
      </div>
    </div>
  );
}
