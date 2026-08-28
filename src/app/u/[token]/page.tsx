import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Fiche d'urgence — Mon Carnet Santé" };

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function UrgencePubliquePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Récupérer le token
  const { data: tokenRow } = await supabaseAdmin
    .from("emergency_tokens")
    .select("person_id")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Fiche introuvable</h1>
          <p className="text-sm text-gray-500">Ce lien d&apos;urgence est invalide ou a été révoqué.</p>
        </div>
      </div>
    );
  }

  const personId = tokenRow.person_id;
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: person },
    { data: allergies },
    { data: treatments },
    { data: conditions },
  ] = await Promise.all([
    supabaseAdmin.from("persons").select("first_name, last_name, date_of_birth, blood_type, emergency_contact_name, emergency_contact_phone").eq("id", personId).single(),
    supabaseAdmin.from("allergies").select("allergen, severity").eq("person_id", personId).in("severity", ["severe", "life_threatening"]),
    supabaseAdmin.from("treatments").select("medication_name, dosage").eq("person_id", personId).or(`end_date.is.null,end_date.gte.${today}`),
    supabaseAdmin.from("chronic_conditions").select("condition_name").eq("person_id", personId).eq("status", "active"),
  ]);

  if (!person) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
        <div className="text-center"><p className="text-gray-500">Données introuvables.</p></div>
      </div>
    );
  }

  const age = person.date_of_birth
    ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const nom = `${person.first_name} ${person.last_name ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-red-600 px-4 py-6">
      {/* Header urgence */}
      <div className="max-w-md mx-auto">
        <div className="text-center mb-5">
          <div className="text-4xl mb-1">🆘</div>
          <h1 className="text-2xl font-black text-white tracking-tight">FICHE D&apos;URGENCE</h1>
          <p className="text-red-200 text-xs mt-1">Données médicales critiques — Mon Carnet Santé</p>
        </div>

        {/* Identité */}
        <div className="bg-white rounded-2xl p-5 mb-3 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-2xl flex-shrink-0">
              👤
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{nom}</p>
              {age && <p className="text-sm text-gray-500">{age} ans{person.date_of_birth ? ` · né(e) le ${new Date(person.date_of_birth).toLocaleDateString("fr-FR")}` : ""}</p>}
              {person.blood_type && (
                <span className="inline-block mt-1 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Groupe {person.blood_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Allergies critiques */}
        {allergies && allergies.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-3 shadow border-l-4 border-red-500">
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-2">⚠️ Allergies graves</h2>
            <div className="flex flex-wrap gap-2">
              {allergies.map((a, i) => (
                <span key={i} className="bg-red-50 border border-red-300 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                  {a.allergen}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Traitements en cours */}
        {treatments && treatments.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-3 shadow">
            <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-2">💊 Traitements en cours</h2>
            <ul className="space-y-1">
              {treatments.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {t.medication_name}{t.dosage ? ` — ${t.dosage}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Antécédents */}
        {conditions && conditions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-3 shadow">
            <h2 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-2">🏥 Antécédents chroniques</h2>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c, i) => (
                <span key={i} className="bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  {c.condition_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact urgence */}
        {person.emergency_contact_name && (
          <div className="bg-white rounded-2xl p-4 mb-3 shadow">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">📞 Contact d&apos;urgence</h2>
            <p className="font-semibold text-gray-900">{person.emergency_contact_name}</p>
            {person.emergency_contact_phone && (
              <a
                href={`tel:${person.emergency_contact_phone}`}
                className="mt-2 flex items-center gap-2 bg-green-600 text-white font-semibold rounded-xl px-4 py-3 text-sm active:bg-green-700"
              >
                📱 Appeler — {person.emergency_contact_phone}
              </a>
            )}
          </div>
        )}

        {/* Si aucune donnée critique */}
        {(!allergies?.length && !treatments?.length && !conditions?.length) && (
          <div className="bg-white rounded-2xl p-5 mb-3 shadow text-center">
            <p className="text-gray-500 text-sm">Aucune donnée médicale critique enregistrée.</p>
          </div>
        )}

        <p className="text-center text-red-200 text-xs mt-4">
          Propulsé par Mon Carnet Santé · GBOL · Données chiffrées Supabase
        </p>
      </div>
    </div>
  );
}
