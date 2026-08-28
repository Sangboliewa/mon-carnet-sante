"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

interface PMAAttempt {
  id: string;
  person_id: string;
  attempt_number: number;
  protocol_type: string | null;
  start_date: string | null;
  status: string;
  clinic: string | null;
  doctor_name: string | null;
  result: string | null;
  oocytes_retrieved: number | null;
  oocytes_fertilized: number | null;
  blastocysts: number | null;
  embryos_transferred: number | null;
  beta_hcg_value: number | null;
  created_at: string;
}

interface Props {
  personId: string;
  personName: string;
  initialAttempts: PMAAttempt[];
}

const PROTOCOLS = ["FIV", "FIV-ICSI", "IAI", "FEC", "Don d'ovocytes", "Don d'embryons", "Autre"];
const STATUSES = [
  { value: "en_cours",   labelFr: "En cours",   labelEn: "In progress", color: "bg-blue-100 text-blue-700" },
  { value: "réussi",     labelFr: "Réussi 🎉",   labelEn: "Successful 🎉", color: "bg-green-100 text-green-700" },
  { value: "échec",      labelFr: "Échec",       labelEn: "Unsuccessful", color: "bg-red-100 text-red-700" },
  { value: "abandonné",  labelFr: "Abandonné",   labelEn: "Abandoned", color: "bg-gray-100 text-gray-600" },
];
const RESULTS = [
  { value: "positif",       labelFr: "β-HCG positif ✓",   labelEn: "β-HCG positive ✓" },
  { value: "négatif",       labelFr: "β-HCG négatif",      labelEn: "β-HCG negative" },
  { value: "fausse_couche", labelFr: "Fausse couche",       labelEn: "Miscarriage" },
];

function statusMeta(val: string, lang: "fr" | "en") {
  const s = STATUSES.find(s => s.value === val) ?? STATUSES[0];
  return { label: lang === "en" ? s.labelEn : s.labelFr, color: s.color };
}

export default function PMAClient({ personId, personName, initialAttempts }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const router = useRouter();
  const supabase = createClient();

  const [attempts, setAttempts] = useState<PMAAttempt[]>(initialAttempts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nextNumber = attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) + 1 : 1;

  const [form, setForm] = useState({
    attempt_number: nextNumber,
    protocol_type: "FIV",
    start_date: "",
    status: "en_cours",
    clinic: "",
    doctor_name: "",
  });

  function setField(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { data, error: err } = await supabase
      .from("pma_attempts")
      .insert({
        person_id: personId,
        attempt_number: form.attempt_number,
        protocol_type: form.protocol_type || null,
        start_date: form.start_date || null,
        status: form.status,
        clinic: form.clinic.trim() || null,
        doctor_name: form.doctor_name.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data) {
      setAttempts([data, ...attempts]);
      setShowForm(false);
      router.push(`/pma/${data.id}`);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 px-4 pt-12 pb-8">
        <Link href="/dashboard" className="text-pink-200 text-sm flex items-center gap-1 mb-4">
          ← {t("Tableau de bord", "Dashboard")}
        </Link>
        <h1 className="text-white text-2xl font-bold">🌸 {t("Parcours PMA", "IVF Journey")}</h1>
        <p className="text-pink-100 text-sm mt-1">{personName}</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-medium">
            {attempts.length} {t("tentative(s)", "attempt(s)")}
          </span>
          {attempts.some(a => a.status === "réussi") && (
            <span className="text-xs bg-green-400/30 text-white px-3 py-1 rounded-full font-medium">🎉 {t("Succès obtenu", "Success achieved")}</span>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Bouton nouvelle tentative */}
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full py-3 bg-pink-600 text-white font-semibold rounded-2xl active:opacity-80 flex items-center justify-center gap-2"
        >
          {showForm ? t("Annuler", "Cancel") : `+ ${t("Nouvelle tentative", "New attempt")}`}
        </button>

        {/* Formulaire création */}
        {showForm && (
          <form onSubmit={handleCreate} className="card border-pink-200 bg-pink-50 space-y-3">
            <p className="font-semibold text-pink-800">{t("Créer une tentative", "Create an attempt")}</p>
            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t("N° tentative", "Attempt #")}</label>
                <input
                  type="number" min={1} className="input-field"
                  value={form.attempt_number}
                  onChange={e => setField("attempt_number", parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="label">{t("Date de début", "Start date")}</label>
                <input type="date" className="input-field" value={form.start_date} onChange={e => setField("start_date", e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">{t("Type de protocole", "Protocol type")}</label>
              <select className="input-field" value={form.protocol_type} onChange={e => setField("protocol_type", e.target.value)}>
                {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="label">{t("Statut", "Status")}</label>
              <select className="input-field" value={form.status} onChange={e => setField("status", e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "en" ? s.labelEn : s.labelFr}</option>)}
              </select>
            </div>

            <div>
              <label className="label">{t("Clinique / Centre PMA", "Clinic / IVF center")}</label>
              <input className="input-field" value={form.clinic} onChange={e => setField("clinic", e.target.value)} placeholder={t("ex : Centre de fertilité Abidjan", "e.g. Fertility Clinic Abidjan")} />
            </div>

            <div>
              <label className="label">{t("Médecin référent", "Referring doctor")}</label>
              <input className="input-field" value={form.doctor_name} onChange={e => setField("doctor_name", e.target.value)} placeholder="Dr. …" />
            </div>

            <button type="submit" disabled={saving} className="w-full py-3 bg-pink-600 text-white font-semibold rounded-xl disabled:opacity-50">
              {saving ? t("Enregistrement…", "Saving…") : t("Créer la tentative", "Create attempt")}
            </button>
          </form>
        )}

        {/* Liste des tentatives */}
        {attempts.length === 0 && !showForm ? (
          <div className="card text-center py-12 space-y-3">
            <div className="text-5xl">🌸</div>
            <p className="font-semibold text-gray-800">{t("Aucune tentative enregistrée", "No attempts recorded yet")}</p>
            <p className="text-sm text-gray-500 px-4">
              {t("Enregistrez votre parcours PMA pour suivre chaque tentative, les résultats et le journal de stimulation.", "Record your IVF journey to track each attempt, results, and stimulation journal.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t("Tentatives", "Attempts")}</p>
            {attempts.map(attempt => {
              const { label: statusLabel, color: statusColor } = statusMeta(attempt.status, lang);
              const resultItem = RESULTS.find(r => r.value === attempt.result);
              return (
                <Link key={attempt.id} href={`/pma/${attempt.id}`} className="card flex items-start gap-4 active:opacity-80 border-l-4 border-l-pink-400">
                  {/* Numéro */}
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs text-pink-500 font-medium">{t("T", "A")}</span>
                    <span className="text-lg font-bold text-pink-700 leading-none">{attempt.attempt_number}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{attempt.protocol_type ?? t("Protocole non défini", "Protocol not set")}</p>
                        {attempt.start_date && <p className="text-xs text-gray-500">{t("Début :", "Start:")} {attempt.start_date}</p>}
                        {attempt.clinic && <p className="text-xs text-gray-500">{attempt.clinic}</p>}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>{statusLabel}</span>
                    </div>

                    {/* Résumé chiffres */}
                    {(attempt.oocytes_retrieved || attempt.embryos_transferred || attempt.beta_hcg_value) && (
                      <div className="flex gap-3 mt-2 flex-wrap">
                        {attempt.oocytes_retrieved != null && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            🥚 {attempt.oocytes_retrieved} {t("ovocytes", "oocytes")}
                          </span>
                        )}
                        {attempt.embryos_transferred != null && (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            🔬 {attempt.embryos_transferred} {t("transférés", "transferred")}
                          </span>
                        )}
                        {attempt.beta_hcg_value != null && (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                            β-HCG {attempt.beta_hcg_value}
                          </span>
                        )}
                      </div>
                    )}

                    {resultItem && (
                      <p className="text-xs mt-1 font-medium text-gray-600">
                        {lang === "en" ? resultItem.labelEn : resultItem.labelFr}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-300 self-center">→</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="card bg-pink-50 border-pink-100">
          <p className="text-xs text-pink-700 font-medium mb-1">💡 {t("Comment utiliser ce module", "How to use this module")}</p>
          <ul className="text-xs text-pink-600 space-y-1">
            <li>• {t("Créez une tentative par cycle PMA", "Create one attempt per IVF cycle")}</li>
            <li>• {t("Renseignez le journal de stimulation jour par jour", "Fill in the stimulation journal day by day")}</li>
            <li>• {t("Ajoutez les résultats (ponction, transfert, β-HCG)", "Add results (retrieval, transfer, β-HCG)")}</li>
          </ul>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
