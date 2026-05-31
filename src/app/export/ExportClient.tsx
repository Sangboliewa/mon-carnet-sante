"use client";
import type { Person } from "@/lib/supabase/types";

const SEV: Record<string, string> = { mild: "légère", moderate: "modérée", severe: "sévère", life_threatening: "⚡ Vie en danger" };
const COND: Record<string, string> = { active: "Active", remission: "En rémission", resolved: "Résolue" };

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-900">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 print:mb-4">
      <h2 className="text-sm font-bold text-health-blue uppercase tracking-wider border-b border-health-blue pb-1 mb-2">{title}</h2>
      {children}
    </div>
  );
}

interface Props {
  person: Person;
  allergies: { allergen: string; severity: string | null; reaction: string | null; diagnosed_date: string | null }[];
  conditions: { condition_name: string; status: string | null; diagnosed_date: string | null }[];
  treatments: { medication_name: string; dosage: string | null; frequency: string | null; start_date: string | null; end_date: string | null; prescribing_doctor: string | null }[];
  vaccinations: { vaccine_name: string; administered_date: string | null; next_dose_date: string | null }[];
  consultations: { consultation_date: string; doctor_name: string | null; specialty: string | null; reason: string | null; diagnosis: string | null; prescription_text: string | null }[];
  labResults: { test_date: string; test_name: string; value: number; unit: string; ref_min: number | null; ref_max: number | null }[];
  exportDate: string;
}

export default function ExportClient({ person, allergies, conditions, treatments, vaccinations, consultations, labResults, exportDate }: Props) {
  const age = person.date_of_birth
    ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Bouton imprimer — masqué à l'impression */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-4 py-3 flex gap-3">
        <button onClick={() => window.print()} className="btn-primary py-2 text-sm">
          🖨️ Imprimer / Enregistrer en PDF
        </button>
        <button onClick={() => window.history.back()} className="flex-1 rounded-xl border border-gray-300 py-2 text-sm text-gray-600">
          ← Retour
        </button>
      </div>

      {/* Document imprimable */}
      <div className="max-w-2xl mx-auto px-6 py-8 print:px-4 print:py-4" id="export-content">
        {/* En-tête */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-health-blue">
          <div>
            <h1 className="text-2xl font-bold text-health-blue">Carnet de Santé</h1>
            <p className="text-gray-500 text-sm">Exporté le {new Date(exportDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900 text-lg">{person.first_name} {person.last_name}</p>
            {age != null && <p className="text-sm text-gray-500">{age} ans</p>}
            {person.blood_type && <p className="text-sm font-semibold text-red-600">Groupe {person.blood_type}</p>}
          </div>
        </div>

        {/* Identité */}
        <Section title="Informations personnelles">
          <Row label="Nom complet" value={`${person.first_name} ${person.last_name}`} />
          <Row label="Date de naissance" value={person.date_of_birth ?? undefined} />
          <Row label="Genre" value={person.gender === "male" ? "Masculin" : person.gender === "female" ? "Féminin" : undefined} />
          <Row label="Groupe sanguin" value={person.blood_type ?? undefined} />
          <Row label="Taille" value={person.height_cm ? `${person.height_cm} cm` : undefined} />
          <Row label="Poids" value={person.weight_kg ? `${person.weight_kg} kg` : undefined} />
          <Row label="Contact urgence" value={person.emergency_contact_name ?? undefined} />
          <Row label="Tél. urgence" value={person.emergency_contact_phone ?? undefined} />
        </Section>

        {/* Allergies */}
        {allergies.length > 0 && (
          <Section title="⚠️ Allergies">
            {allergies.map((a, i) => (
              <div key={i} className="mb-2 p-2 bg-red-50 rounded-lg">
                <p className="font-semibold text-sm text-red-800">{a.allergen} {a.severity && `— ${SEV[a.severity] ?? a.severity}`}</p>
                {a.reaction && <p className="text-xs text-gray-600">Réaction : {a.reaction}</p>}
                {a.diagnosed_date && <p className="text-xs text-gray-400">Diagnostiqué : {a.diagnosed_date}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Maladies chroniques */}
        {conditions.length > 0 && (
          <Section title="Antécédents médicaux">
            {conditions.map((c, i) => (
              <div key={i} className="mb-1">
                <p className="text-sm font-medium text-gray-900">{c.condition_name}
                  {c.status && <span className="text-xs text-gray-500 ml-1">({COND[c.status] ?? c.status})</span>}
                </p>
                {c.diagnosed_date && <p className="text-xs text-gray-400">Depuis : {c.diagnosed_date}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Traitements */}
        {treatments.length > 0 && (
          <Section title="💊 Traitements en cours">
            {treatments.map((t, i) => (
              <div key={i} className="mb-1">
                <p className="text-sm font-medium text-gray-900">{t.medication_name}
                  {t.dosage && <span className="text-gray-600"> — {t.dosage}</span>}
                  {t.frequency && <span className="text-gray-500"> ({t.frequency})</span>}
                </p>
                {t.prescribing_doctor && <p className="text-xs text-gray-400">Dr {t.prescribing_doctor}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Vaccinations */}
        {vaccinations.length > 0 && (
          <Section title="💉 Vaccinations">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-1">Vaccin</th><th className="pb-1">Administré</th><th className="pb-1">Rappel</th>
              </tr></thead>
              <tbody>
                {vaccinations.map((v, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-0.5 font-medium">{v.vaccine_name}</td>
                    <td className="py-0.5 text-gray-600">{v.administered_date ?? "—"}</td>
                    <td className={`py-0.5 ${v.next_dose_date && v.next_dose_date < new Date().toISOString().split("T")[0] ? "text-red-600 font-medium" : "text-gray-600"}`}>
                      {v.next_dose_date ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Consultations récentes */}
        {consultations.length > 0 && (
          <Section title="🩺 Consultations récentes">
            {consultations.map((c, i) => (
              <div key={i} className="mb-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-900">{c.consultation_date} — {c.specialty ?? "Consultation"}</p>
                {c.doctor_name && <p className="text-xs text-gray-500">Dr {c.doctor_name}</p>}
                {c.reason && <p className="text-xs text-gray-600">Motif : {c.reason}</p>}
                {c.diagnosis && <p className="text-xs text-gray-700">Diagnostic : {c.diagnosis}</p>}
                {c.prescription_text && <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">Prescription : {c.prescription_text}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Résultats labo */}
        {labResults.length > 0 && (
          <Section title="🔬 Résultats de laboratoire">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-1">Examen</th><th className="pb-1">Date</th><th className="pb-1">Résultat</th><th className="pb-1">Norme</th>
              </tr></thead>
              <tbody>
                {labResults.map((r, i) => {
                  const isAbnormal = (r.ref_min != null && r.value < r.ref_min) || (r.ref_max != null && r.value > r.ref_max);
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-0.5 font-medium">{r.test_name}</td>
                      <td className="py-0.5 text-gray-600">{r.test_date}</td>
                      <td className={`py-0.5 font-medium ${isAbnormal ? "text-red-600" : "text-gray-900"}`}>{r.value} {r.unit}</td>
                      <td className="py-0.5 text-gray-500">{r.ref_min != null && r.ref_max != null ? `${r.ref_min}–${r.ref_max}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        )}

        {/* Pied de page */}
        <div className="mt-8 pt-4 border-t text-xs text-gray-400 text-center">
          Document généré par Mon Carnet Santé · {exportDate} · Confidentiel
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body { font-size: 11px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
