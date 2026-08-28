import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

interface MedItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function VerifyRxPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: rx } = await supabaseAdmin
    .from("prescriptions")
    .select("id, doctor_name, doctor_specialty, prescription_date, expiry_date, medications, status, verification_token, person_id")
    .eq("verification_token", token)
    .single();

  if (!rx) notFound();

  const isValid = rx.status === "active" && (!rx.expiry_date || new Date(rx.expiry_date) >= new Date());

  const { data: person } = await supabaseAdmin
    .from("persons")
    .select("first_name, last_name")
    .eq("id", rx.person_id)
    .single();

  const meds = rx.medications as MedItem[];

  const prescriptionDate = new Date(rx.prescription_date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const expiryDate = rx.expiry_date
    ? new Date(rx.expiry_date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="px-4 py-10 text-center"
        style={{ background: "linear-gradient(135deg, #2EA87E 0%, #1a7a5e 100%)" }}
      >
        <p className="text-white/70 text-xs uppercase tracking-widest mb-2">Mon Carnet Santé</p>
        <h1 className="text-white text-xl font-bold">Vérification d&apos;ordonnance</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div
          className="rounded-2xl p-6 text-center shadow-sm border"
          style={{
            borderColor: isValid ? "#2EA87E" : "#EF4444",
            backgroundColor: isValid ? "#f0fdf8" : "#fff5f5",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
            style={{ backgroundColor: isValid ? "#2EA87E" : "#EF4444" }}
          >
            {isValid ? "✓" : "✕"}
          </div>
          <p
            className="text-lg font-bold"
            style={{ color: isValid ? "#2EA87E" : "#EF4444" }}
          >
            {isValid ? "Ordonnance valide" : "Ordonnance invalide ou expirée"}
          </p>
          {!isValid && rx.status !== "active" && (
            <p className="text-sm text-gray-500 mt-1">Statut : {rx.status}</p>
          )}
        </div>

        {person && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Patient</p>
            <p className="font-semibold text-gray-900">
              {person.first_name} {person.last_name ?? ""}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Médecin prescripteur</p>
          <p className="font-semibold text-gray-900">
            {rx.doctor_name ? `Dr. ${rx.doctor_name}` : "—"}
          </p>
          {rx.doctor_specialty && (
            <p className="text-sm text-gray-500">{rx.doctor_specialty}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-400">Date de prescription</p>
              <p className="text-sm font-medium text-gray-800">{prescriptionDate}</p>
            </div>
            {expiryDate && (
              <div>
                <p className="text-xs text-gray-400">Expire le</p>
                <p className="text-sm font-medium text-red-600">{expiryDate}</p>
              </div>
            )}
          </div>
        </div>

        {meds && meds.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Médicaments prescrits</p>
            <ul className="space-y-2">
              {meds.map((m, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-900">{m.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-gray-400">Généré par</p>
          <p className="text-xs font-semibold text-emerald-700">Mon Carnet Santé</p>
        </div>
      </div>
    </div>
  );
}
