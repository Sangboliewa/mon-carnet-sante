"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

interface MedItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  person_id: string;
  created_by: string;
  doctor_name: string | null;
  doctor_specialty: string | null;
  prescription_date: string;
  expiry_date: string | null;
  medications: MedItem[];
  instructions: string | null;
  status: "active" | "expired" | "cancelled";
  created_at: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
}

interface Props {
  personId: string;
  personName: string;
  userId: string;
  initialPrescriptions: Prescription[];
  doctors: Doctor[];
}

const EMPTY_MED: MedItem = { name: "", dosage: "", frequency: "", duration: "" };

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  expired:   "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-600",
};

export default function PrescriptionsClient({ personId, personName, userId, initialPrescriptions, doctors }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [meds, setMeds] = useState<MedItem[]>([{ ...EMPTY_MED }]);

  // Pre-fill from URL params (coming from teleconsultation compte-rendu)
  useEffect(() => {
    const doctorParam = searchParams.get("doctor");
    const specialtyParam = searchParams.get("specialty");
    if (doctorParam) {
      setDoctorName(doctorParam);
      setDoctorSpecialty(specialtyParam ?? "");
      setShowForm(true);
    }
  }, [searchParams]);

  function selectDoctor(d: Doctor) {
    setDoctorName(d.name);
    setDoctorSpecialty(d.specialty ?? "");
  }

  function updateMed(i: number, field: keyof MedItem, value: string) {
    setMeds(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  function addMed() {
    setMeds(prev => [...prev, { ...EMPTY_MED }]);
  }

  function removeMed(i: number) {
    setMeds(prev => prev.filter((_, idx) => idx !== i));
  }

  function resetForm() {
    setDoctorName(""); setDoctorSpecialty("");
    setPrescriptionDate(new Date().toISOString().split("T")[0]);
    setExpiryDate(""); setInstructions("");
    setMeds([{ ...EMPTY_MED }]);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validMeds = meds.filter(m => m.name.trim());
    if (!validMeds.length) { setError(t("Ajoutez au moins un médicament.", "Add at least one medication.")); return; }
    setSaving(true);
    setError("");
    const { data, error: err } = await supabase
      .from("prescriptions")
      .insert({
        person_id: personId,
        created_by: userId,
        doctor_name: doctorName || null,
        doctor_specialty: doctorSpecialty || null,
        prescription_date: prescriptionDate,
        expiry_date: expiryDate || null,
        medications: validMeds,
        instructions: instructions || null,
        status: "active",
      })
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    setPrescriptions(prev => [data as Prescription, ...prev]);
    setShowForm(false);
    resetForm();
  }

  async function changeStatus(id: string, status: Prescription["status"]) {
    await supabase.from("prescriptions").update({ status }).eq("id", id);
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }

  async function deletePrescription(id: string) {
    if (!confirm(t("Supprimer cette ordonnance ?", "Delete this prescription?"))) return;
    await supabase.from("prescriptions").delete().eq("id", id);
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard" className="text-white/70 text-sm">←</Link>
          <h1 className="text-white text-xl font-bold">💊 {t("Ordonnances", "Prescriptions")}</h1>
        </div>
        <p className="text-emerald-100 text-sm">{personName}</p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Bouton ajouter */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full card border-dashed border-2 border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-sm flex items-center justify-center gap-2 py-4 active:bg-emerald-100"
          >
            + {t("Nouvelle ordonnance", "New prescription")}
          </button>
        )}

        {/* Formulaire */}
        {showForm && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <h2 className="font-bold text-gray-900">{t("Nouvelle ordonnance", "New prescription")}</h2>

            {/* Sélection médecin existant */}
            {doctors.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">{t("Médecin enregistré", "Registered doctor")}</p>
                <div className="flex gap-2 flex-wrap">
                  {doctors.map(d => (
                    <button
                      key={d.id} type="button"
                      onClick={() => selectDoctor(d)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${doctorName === d.name ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-200"}`}
                    >
                      {d.name}{d.specialty ? ` · ${d.specialty}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Médecin */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("Nom du médecin", "Doctor name")}</label>
                <input
                  className="input-field"
                  value={doctorName}
                  onChange={e => setDoctorName(e.target.value)}
                  placeholder={t("Dr. Kouassi", "Dr. Smith")}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("Spécialité", "Specialty")}</label>
                <input
                  className="input-field"
                  value={doctorSpecialty}
                  onChange={e => setDoctorSpecialty(e.target.value)}
                  placeholder={t("Généraliste", "General")}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("Date", "Date")}</label>
                <input type="date" className="input-field" value={prescriptionDate} onChange={e => setPrescriptionDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("Expiration", "Expiry")}</label>
                <input type="date" className="input-field" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              </div>
            </div>

            {/* Médicaments */}
            <div>
              <p className="text-xs text-gray-500 mb-2">{t("Médicaments", "Medications")}</p>
              <div className="space-y-3">
                {meds.map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 relative">
                    {meds.length > 1 && (
                      <button type="button" onClick={() => removeMed(i)} className="absolute top-2 right-2 text-gray-400 text-xs hover:text-red-500">✕</button>
                    )}
                    <input
                      className="input-field"
                      placeholder={t("Nom du médicament *", "Medication name *")}
                      value={m.name}
                      onChange={e => updateMed(i, "name", e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input className="input-field text-xs" placeholder={t("Dosage", "Dosage")} value={m.dosage} onChange={e => updateMed(i, "dosage", e.target.value)} />
                      <input className="input-field text-xs" placeholder={t("Fréquence", "Frequency")} value={m.frequency} onChange={e => updateMed(i, "frequency", e.target.value)} />
                      <input className="input-field text-xs" placeholder={t("Durée", "Duration")} value={m.duration} onChange={e => updateMed(i, "duration", e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addMed} className="mt-2 text-xs text-emerald-600 font-medium">
                + {t("Ajouter un médicament", "Add medication")}
              </button>
            </div>

            {/* Instructions */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("Instructions / Notes", "Instructions / Notes")}</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder={t("À prendre avec de la nourriture…", "Take with food…")}
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                {t("Annuler", "Cancel")}
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? "…" : t("Enregistrer", "Save")}
              </button>
            </div>
          </form>
        )}

        {/* Liste */}
        {prescriptions.length === 0 && !showForm && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">💊</p>
            <p className="font-medium text-gray-500">{t("Aucune ordonnance", "No prescriptions")}</p>
            <p className="text-sm mt-1">{t("Créez votre première ordonnance ci-dessus", "Create your first prescription above")}</p>
          </div>
        )}

        {prescriptions.map(p => (
          <div key={p.id} className="card space-y-3">
            {/* En-tête */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {p.doctor_name ? `Dr. ${p.doctor_name}` : t("Médecin inconnu", "Unknown doctor")}
                  {p.doctor_specialty ? ` · ${p.doctor_specialty}` : ""}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(p.prescription_date).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  {p.expiry_date && ` → ${new Date(p.expiry_date).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short" })}`}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_BADGE[p.status]}`}>
                {p.status === "active" ? t("Actif", "Active") : p.status === "expired" ? t("Expiré", "Expired") : t("Annulé", "Cancelled")}
              </span>
            </div>

            {/* Médicaments */}
            <div className="space-y-1.5 border-t border-gray-100 pt-2">
              {(p.medications as MedItem[]).map((m, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <div>
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    {(m.dosage || m.frequency || m.duration) && (
                      <span className="text-xs text-gray-500 ml-1.5">
                        {[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {p.instructions && (
              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-emerald-300">
                {p.instructions}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Link
                href={`/prescriptions/${p.id}`}
                className="flex-1 text-center py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200"
              >
                🖨️ {t("Voir / Imprimer", "View / Print")}
              </Link>
              {p.status === "active" && (
                <button
                  onClick={() => changeStatus(p.id, "expired")}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium"
                >
                  {t("Archiver", "Archive")}
                </button>
              )}
              <button
                onClick={() => deletePrescription(p.id)}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-medium"
              >
                🗑
              </button>
            </div>
          </div>
        ))}

        <div className="h-6" />
      </div>
    </div>
  );
}
