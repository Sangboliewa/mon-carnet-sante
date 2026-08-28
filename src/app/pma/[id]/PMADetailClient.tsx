"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

interface PMAAttempt {
  id: string;
  attempt_number: number;
  protocol_type: string | null;
  start_date: string | null;
  status: string;
  clinic: string | null;
  doctor_name: string | null;
  stimulation_protocol: string | null;
  puncture_date: string | null;
  oocytes_retrieved: number | null;
  oocytes_fertilized: number | null;
  blastocysts: number | null;
  transfer_date: string | null;
  embryos_transferred: number | null;
  embryo_quality: string | null;
  beta_hcg_date: string | null;
  beta_hcg_value: number | null;
  result: string | null;
  notes: string | null;
}

interface CycleLog {
  id: string;
  attempt_id: string;
  log_date: string;
  day_number: number | null;
  medications: { name: string; dose: string; unit: string }[] | null;
  follicle_count: number | null;
  endometrium_mm: number | null;
  e2_level: number | null;
  notes: string | null;
}

interface Props {
  attempt: PMAAttempt;
  initialLogs: CycleLog[];
}

const STATUSES: Record<string, { fr: string; en: string; color: string }> = {
  "en_cours":  { fr: "En cours",  en: "In progress",  color: "bg-blue-100 text-blue-700" },
  "réussi":    { fr: "Réussi 🎉", en: "Successful 🎉", color: "bg-green-100 text-green-700" },
  "échec":     { fr: "Échec",     en: "Unsuccessful",  color: "bg-red-100 text-red-700" },
  "abandonné": { fr: "Abandonné", en: "Abandoned",     color: "bg-gray-100 text-gray-600" },
};
const RESULTS: Record<string, { fr: string; en: string }> = {
  "positif":       { fr: "β-HCG positif ✓",  en: "β-HCG positive ✓" },
  "négatif":       { fr: "β-HCG négatif",    en: "β-HCG negative" },
  "fausse_couche": { fr: "Fausse couche",     en: "Miscarriage" },
};

type Tab = "resume" | "stimulation" | "resultats";

export default function PMADetailClient({ attempt: initialAttempt, initialLogs }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const router = useRouter();
  const supabase = createClient();

  const [attempt, setAttempt] = useState(initialAttempt);
  const [logs, setLogs] = useState<CycleLog[]>(initialLogs);
  const [tab, setTab] = useState<Tab>("resume");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ── Edit attempt form ──
  const [form, setForm] = useState({
    protocol_type: attempt.protocol_type ?? "",
    start_date: attempt.start_date ?? "",
    status: attempt.status,
    clinic: attempt.clinic ?? "",
    doctor_name: attempt.doctor_name ?? "",
    stimulation_protocol: attempt.stimulation_protocol ?? "",
    puncture_date: attempt.puncture_date ?? "",
    oocytes_retrieved: attempt.oocytes_retrieved?.toString() ?? "",
    oocytes_fertilized: attempt.oocytes_fertilized?.toString() ?? "",
    blastocysts: attempt.blastocysts?.toString() ?? "",
    transfer_date: attempt.transfer_date ?? "",
    embryos_transferred: attempt.embryos_transferred?.toString() ?? "",
    embryo_quality: attempt.embryo_quality ?? "",
    beta_hcg_date: attempt.beta_hcg_date ?? "",
    beta_hcg_value: attempt.beta_hcg_value?.toString() ?? "",
    result: attempt.result ?? "",
    notes: attempt.notes ?? "",
  });

  // ── Add cycle log form ──
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    day_number: "",
    follicle_count: "",
    endometrium_mm: "",
    e2_level: "",
    notes: "",
    medications: [{ name: "", dose: "", unit: "mg" }],
  });

  function setF(field: string, value: string) { setForm(p => ({ ...p, [field]: value })); }
  function setLF(field: string, value: string) { setLogForm(p => ({ ...p, [field]: value })); }

  async function saveAttempt(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.from("pma_attempts").update({
      protocol_type: form.protocol_type || null,
      start_date: form.start_date || null,
      status: form.status,
      clinic: form.clinic.trim() || null,
      doctor_name: form.doctor_name.trim() || null,
      stimulation_protocol: form.stimulation_protocol.trim() || null,
      puncture_date: form.puncture_date || null,
      oocytes_retrieved: form.oocytes_retrieved ? parseInt(form.oocytes_retrieved) : null,
      oocytes_fertilized: form.oocytes_fertilized ? parseInt(form.oocytes_fertilized) : null,
      blastocysts: form.blastocysts ? parseInt(form.blastocysts) : null,
      transfer_date: form.transfer_date || null,
      embryos_transferred: form.embryos_transferred ? parseInt(form.embryos_transferred) : null,
      embryo_quality: form.embryo_quality.trim() || null,
      beta_hcg_date: form.beta_hcg_date || null,
      beta_hcg_value: form.beta_hcg_value ? parseFloat(form.beta_hcg_value) : null,
      result: form.result || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", attempt.id).select().single();
    setSaving(false);
    if (!error && data) { setAttempt(data); setEditMode(false); }
  }

  async function saveLog(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const meds = logForm.medications.filter(m => m.name.trim());
    const { data, error } = await supabase.from("pma_cycle_logs").insert({
      attempt_id: attempt.id,
      log_date: logForm.log_date,
      day_number: logForm.day_number ? parseInt(logForm.day_number) : null,
      follicle_count: logForm.follicle_count ? parseInt(logForm.follicle_count) : null,
      endometrium_mm: logForm.endometrium_mm ? parseFloat(logForm.endometrium_mm) : null,
      e2_level: logForm.e2_level ? parseFloat(logForm.e2_level) : null,
      notes: logForm.notes.trim() || null,
      medications: meds.length > 0 ? meds : [],
    }).select().single();
    setSaving(false);
    if (!error && data) {
      setLogs(prev => [...prev, data].sort((a, b) => a.log_date.localeCompare(b.log_date)));
      setShowLogForm(false);
      setLogForm({ log_date: new Date().toISOString().split("T")[0], day_number: "", follicle_count: "", endometrium_mm: "", e2_level: "", notes: "", medications: [{ name: "", dose: "", unit: "mg" }] });
    }
  }

  async function deleteLog(id: string) {
    await supabase.from("pma_cycle_logs").delete().eq("id", id);
    setLogs(prev => prev.filter(l => l.id !== id));
  }

  const statusMeta = STATUSES[attempt.status] ?? STATUSES["en_cours"];
  const resultMeta = attempt.result ? RESULTS[attempt.result] : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "resume",      label: t("Résumé", "Overview") },
    { key: "stimulation", label: t("Stimulation", "Stimulation") },
    { key: "resultats",   label: t("Résultats", "Results") },
  ];

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 px-4 pt-12 pb-5">
        <Link href="/pma" className="text-pink-200 text-sm flex items-center gap-1 mb-3">
          ← {t("Parcours PMA", "IVF Journey")}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">
              🌸 {t("Tentative", "Attempt")} #{attempt.attempt_number}
            </h1>
            <p className="text-pink-100 text-sm mt-0.5">{attempt.protocol_type ?? t("Protocole non défini", "Protocol not set")}</p>
            {attempt.start_date && <p className="text-pink-200 text-xs mt-0.5">{t("Début :", "Start:")} {attempt.start_date}</p>}
          </div>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusMeta.color}`}>
            {lang === "en" ? statusMeta.en : statusMeta.fr}
          </span>
        </div>
        {resultMeta && (
          <div className="mt-2 bg-white/20 rounded-xl px-3 py-1.5">
            <p className="text-white text-sm font-semibold">{lang === "en" ? resultMeta.en : resultMeta.fr}</p>
            {attempt.beta_hcg_value && <p className="text-pink-100 text-xs">β-HCG : {attempt.beta_hcg_value} UI/L · {attempt.beta_hcg_date}</p>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === tb.key ? "text-pink-600 border-b-2 border-pink-600" : "text-gray-400"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── TAB RÉSUMÉ ── */}
        {tab === "resume" && (
          <>
            {!editMode ? (
              <>
                <div className="card space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-gray-800">{t("Informations générales", "General info")}</p>
                    <button onClick={() => setEditMode(true)} className="text-xs text-pink-600 border border-pink-200 px-3 py-1 rounded-lg">{t("Modifier", "Edit")}</button>
                  </div>
                  <Row label={t("Protocole", "Protocol")} value={attempt.protocol_type} />
                  <Row label={t("Stimulation", "Stimulation")} value={attempt.stimulation_protocol} />
                  <Row label={t("Clinique", "Clinic")} value={attempt.clinic} />
                  <Row label={t("Médecin", "Doctor")} value={attempt.doctor_name} />
                  <Row label={t("Statut", "Status")} value={lang === "en" ? statusMeta.en : statusMeta.fr} />
                </div>
                {attempt.notes && (
                  <div className="card bg-pink-50 border-pink-100">
                    <p className="text-xs text-gray-500 font-medium mb-1">{t("Notes", "Notes")}</p>
                    <p className="text-sm text-gray-700">{attempt.notes}</p>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={saveAttempt} className="card border-pink-200 space-y-3">
                <p className="font-semibold text-pink-800">{t("Modifier la tentative", "Edit attempt")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">{t("Protocole", "Protocol")}</label>
                    <select className="input-field" value={form.protocol_type} onChange={e => setF("protocol_type", e.target.value)}>
                      {["FIV","FIV-ICSI","IAI","FEC","Don d'ovocytes","Don d'embryons","Autre"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label className="label">{t("Statut", "Status")}</label>
                    <select className="input-field" value={form.status} onChange={e => setF("status", e.target.value)}>
                      {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{lang === "en" ? v.en : v.fr}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">{t("Date de début", "Start date")}</label><input type="date" className="input-field" value={form.start_date} onChange={e => setF("start_date", e.target.value)} /></div>
                <div><label className="label">{t("Protocole de stimulation", "Stimulation protocol")}</label><input className="input-field" value={form.stimulation_protocol} onChange={e => setF("stimulation_protocol", e.target.value)} placeholder={t("ex : long, court, antagoniste…", "e.g. long, short, antagonist…")} /></div>
                <div><label className="label">{t("Clinique", "Clinic")}</label><input className="input-field" value={form.clinic} onChange={e => setF("clinic", e.target.value)} /></div>
                <div><label className="label">{t("Médecin", "Doctor")}</label><input className="input-field" value={form.doctor_name} onChange={e => setF("doctor_name", e.target.value)} /></div>
                <div><label className="label">{t("Notes", "Notes")}</label><textarea className="input-field resize-none" rows={3} value={form.notes} onChange={e => setF("notes", e.target.value)} /></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">{t("Annuler", "Cancel")}</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{saving ? "…" : t("Enregistrer", "Save")}</button>
                </div>
              </form>
            )}
          </>
        )}

        {/* ── TAB STIMULATION ── */}
        {tab === "stimulation" && (
          <>
            <button onClick={() => setShowLogForm(v => !v)} className="w-full py-3 bg-pink-600 text-white font-semibold rounded-2xl active:opacity-80">
              {showLogForm ? t("Annuler", "Cancel") : `+ ${t("Ajouter une entrée", "Add entry")}`}
            </button>

            {showLogForm && (
              <form onSubmit={saveLog} className="card border-pink-200 bg-pink-50 space-y-3">
                <p className="font-semibold text-pink-800">{t("Entrée du journal", "Journal entry")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">{t("Date", "Date")}</label><input type="date" className="input-field" value={logForm.log_date} onChange={e => setLF("log_date", e.target.value)} /></div>
                  <div><label className="label">{t("Jour cycle (J…)", "Cycle day")}</label><input type="number" min={1} className="input-field" value={logForm.day_number} onChange={e => setLF("day_number", e.target.value)} placeholder="J5" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="label">{t("Follicules", "Follicles")}</label><input type="number" min={0} className="input-field" value={logForm.follicle_count} onChange={e => setLF("follicle_count", e.target.value)} /></div>
                  <div><label className="label">{t("Endomètre (mm)", "Endometrium (mm)")}</label><input type="number" step="0.1" className="input-field" value={logForm.endometrium_mm} onChange={e => setLF("endometrium_mm", e.target.value)} /></div>
                  <div><label className="label">E2 (pg/mL)</label><input type="number" className="input-field" value={logForm.e2_level} onChange={e => setLF("e2_level", e.target.value)} /></div>
                </div>
                {/* Médicaments */}
                <div>
                  <label className="label">{t("Médicaments du jour", "Today's medications")}</label>
                  <div className="space-y-2">
                    {logForm.medications.map((med, i) => (
                      <div key={i} className="flex gap-2">
                        <input className="input-field flex-1" placeholder={t("Médicament", "Medication")} value={med.name} onChange={e => setLogForm(p => ({ ...p, medications: p.medications.map((m, idx) => idx === i ? { ...m, name: e.target.value } : m) }))} />
                        <input className="input-field w-20" placeholder={t("Dose", "Dose")} value={med.dose} onChange={e => setLogForm(p => ({ ...p, medications: p.medications.map((m, idx) => idx === i ? { ...m, dose: e.target.value } : m) }))} />
                        {logForm.medications.length > 1 && <button type="button" onClick={() => setLogForm(p => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }))} className="text-red-400 px-2">×</button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setLogForm(p => ({ ...p, medications: [...p.medications, { name: "", dose: "", unit: "mg" }] }))} className="text-pink-600 text-sm font-medium">{t("+ Médicament", "+ Medication")}</button>
                  </div>
                </div>
                <div><label className="label">{t("Notes", "Notes")}</label><textarea className="input-field resize-none" rows={2} value={logForm.notes} onChange={e => setLF("notes", e.target.value)} /></div>
                <button type="submit" disabled={saving} className="w-full py-2.5 bg-pink-600 text-white font-semibold rounded-xl disabled:opacity-50">{saving ? "…" : t("Enregistrer", "Save")}</button>
              </form>
            )}

            {logs.length === 0 ? (
              <div className="card text-center py-10 text-gray-400">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-sm">{t("Aucune entrée de stimulation", "No stimulation entries yet")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="card border-l-4 border-l-pink-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-bold text-gray-900">{log.log_date}</span>
                        {log.day_number && <span className="ml-2 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">J{log.day_number}</span>}
                      </div>
                      <button onClick={() => deleteLog(log.id)} className="text-xs text-red-400 active:opacity-60">✕</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {log.follicle_count != null && <Chip label={`🫧 ${log.follicle_count} ${t("follicules", "follicles")}`} />}
                      {log.endometrium_mm != null && <Chip label={`🔷 ${log.endometrium_mm} mm`} />}
                      {log.e2_level != null && <Chip label={`E2 ${log.e2_level}`} />}
                    </div>
                    {log.medications && log.medications.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {log.medications.map((m, i) => m.name && (
                          <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">💊 {m.name} {m.dose}</span>
                        ))}
                      </div>
                    )}
                    {log.notes && <p className="text-xs text-gray-500 mt-1 italic">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB RÉSULTATS ── */}
        {tab === "resultats" && (
          <form onSubmit={saveAttempt} className="space-y-4">
            {/* Ponction */}
            <div className="card space-y-3">
              <p className="font-semibold text-gray-800">🥚 {t("Ponction ovocytaire", "Egg retrieval")}</p>
              <div><label className="label">{t("Date de ponction", "Retrieval date")}</label><input type="date" className="input-field" value={form.puncture_date} onChange={e => setF("puncture_date", e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">{t("Ovocytes prélevés", "Oocytes retrieved")}</label><input type="number" min={0} className="input-field" value={form.oocytes_retrieved} onChange={e => setF("oocytes_retrieved", e.target.value)} /></div>
                <div><label className="label">{t("Fécondés", "Fertilized")}</label><input type="number" min={0} className="input-field" value={form.oocytes_fertilized} onChange={e => setF("oocytes_fertilized", e.target.value)} /></div>
                <div><label className="label">{t("Blastocystes", "Blastocysts")}</label><input type="number" min={0} className="input-field" value={form.blastocysts} onChange={e => setF("blastocysts", e.target.value)} /></div>
              </div>
            </div>

            {/* Transfert */}
            <div className="card space-y-3">
              <p className="font-semibold text-gray-800">🔬 {t("Transfert embryonnaire", "Embryo transfer")}</p>
              <div><label className="label">{t("Date de transfert", "Transfer date")}</label><input type="date" className="input-field" value={form.transfer_date} onChange={e => setF("transfer_date", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t("Embryons transférés", "Embryos transferred")}</label><input type="number" min={0} className="input-field" value={form.embryos_transferred} onChange={e => setF("embryos_transferred", e.target.value)} /></div>
                <div><label className="label">{t("Qualité embryon", "Embryo quality")}</label><input className="input-field" value={form.embryo_quality} onChange={e => setF("embryo_quality", e.target.value)} placeholder="ex: 4AA" /></div>
              </div>
            </div>

            {/* β-HCG */}
            <div className="card space-y-3">
              <p className="font-semibold text-gray-800">🩸 β-HCG J14</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t("Date β-HCG", "β-HCG date")}</label><input type="date" className="input-field" value={form.beta_hcg_date} onChange={e => setF("beta_hcg_date", e.target.value)} /></div>
                <div><label className="label">{t("Valeur (UI/L)", "Value (IU/L)")}</label><input type="number" step="0.01" className="input-field" value={form.beta_hcg_value} onChange={e => setF("beta_hcg_value", e.target.value)} /></div>
              </div>
              <div>
                <label className="label">{t("Résultat", "Result")}</label>
                <select className="input-field" value={form.result} onChange={e => setF("result", e.target.value)}>
                  <option value="">{t("— Sélectionner —", "— Select —")}</option>
                  {Object.entries(RESULTS).map(([k, v]) => <option key={k} value={k}>{lang === "en" ? v.en : v.fr}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t("Statut final de la tentative", "Final attempt status")}</label>
                <select className="input-field" value={form.status} onChange={e => setF("status", e.target.value)}>
                  {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{lang === "en" ? v.en : v.fr}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full py-3 bg-pink-600 text-white font-semibold rounded-2xl disabled:opacity-50">
              {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer les résultats", "Save results")}
            </button>
          </form>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">{label}</span>;
}
