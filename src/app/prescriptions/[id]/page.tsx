import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/getCurrentPerson";

interface MedItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default async function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_person_id")?.value ?? null;
  const lang = (cookieStore.get("lang")?.value ?? "fr") === "en" ? "en" : "fr";
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const person = await getCurrentPerson(supabase, user.id, preferredId);
  if (!person) redirect("/profil");

  const { data: rx } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("id", id)
    .eq("person_id", person.id)
    .single();

  if (!rx) notFound();

  const meds = rx.medications as MedItem[];
  const dateStr = new Date(rx.prescription_date).toLocaleDateString(
    lang === "en" ? "en-GB" : "fr-FR",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Nav — masquée à l'impression */}
      <div className="print:hidden bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link href="/prescriptions" className="text-white/70 text-sm">←</Link>
        <h1 className="text-white text-lg font-bold">💊 {t("Ordonnance", "Prescription")}</h1>
        <button
          onClick={() => window.print()}
          className="ml-auto bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium"
        >
          🖨️ {t("Imprimer", "Print")}
        </button>
      </div>

      {/* Fiche imprimable */}
      <div className="max-w-lg mx-auto px-6 py-8 print:py-4 print:px-8">

        {/* En-tête ordonnance */}
        <div className="border-b-2 border-emerald-600 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{t("Médecin prescripteur", "Prescribing doctor")}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {rx.doctor_name ? `Dr. ${rx.doctor_name}` : t("—", "—")}
              </p>
              {rx.doctor_specialty && (
                <p className="text-sm text-gray-600">{rx.doctor_specialty}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{t("Date", "Date")}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{dateStr}</p>
              {rx.expiry_date && (
                <>
                  <p className="text-xs text-gray-400 mt-1">{t("Expire le", "Expires")}</p>
                  <p className="text-sm text-red-600 font-medium">
                    {new Date(rx.expiry_date).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Patient */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t("Patient", "Patient")}</p>
          <p className="font-semibold text-gray-900">{person.first_name} {person.last_name ?? ""}</p>
          {person.date_of_birth && (
            <p className="text-sm text-gray-600">
              {t("Né(e) le", "Born")} {new Date(person.date_of_birth).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Médicaments — style ordonnance */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{t("Médicaments prescrits", "Prescribed medications")}</p>
          <div className="space-y-4">
            {meds.map((m, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <div className="flex flex-wrap gap-3 mt-0.5">
                    {m.dosage && <span className="text-sm text-gray-600">📏 {m.dosage}</span>}
                    {m.frequency && <span className="text-sm text-gray-600">🔄 {m.frequency}</span>}
                    {m.duration && <span className="text-sm text-gray-600">⏱ {m.duration}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        {rx.instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">📝 {t("Instructions", "Instructions")}</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{rx.instructions}</p>
          </div>
        )}

        {/* Vérification QR */}
        {rx.verification_token && (() => {
          const verifyUrl = `https://mon-carnet-sante-nine.vercel.app/verify/rx/${rx.verification_token}`;
          const qrSrc = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(verifyUrl)}`;
          return (
            <div className="mt-6 mb-6 border border-emerald-200 rounded-xl p-4 flex flex-col items-center text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{t("Vérification de l'ordonnance", "Prescription verification")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="QR code de vérification" width={120} height={120} className="rounded-lg mb-3" />
              <p className="text-xs text-gray-500 break-all max-w-xs">{verifyUrl}</p>
            </div>
          );
        })()}

        {/* Pied de page */}
        <div className="border-t border-gray-200 pt-4 mt-8 flex justify-between items-end">
          <div>
            <p className="text-xs text-gray-400">{t("Généré par", "Generated by")}</p>
            <p className="text-xs font-medium text-emerald-700">Mon Carnet Santé</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{t("Signature / Cachet", "Signature / Stamp")}</p>
            <div className="w-28 h-12 border border-dashed border-gray-300 rounded-lg mt-1" />
          </div>
        </div>
      </div>

      {/* Styles print */}
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body { font-size: 12pt; }
        }
      `}</style>
    </div>
  );
}
