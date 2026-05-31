"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import type { Person } from "@/lib/supabase/types";

interface Allergy { allergen: string; severity: string | null }
interface Condition { condition_name: string }

interface TreatmentSummary { medication_name: string; dosage: string | null }

interface Props {
  person: Person;
  allergies: Allergy[];
  treatments: TreatmentSummary[];
  conditions: Condition[];
}

export default function UrgenceClient({ person, allergies, treatments, conditions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const urgenceData = {
    nom: `${person.first_name} ${person.last_name}`,
    ddn: person.date_of_birth,
    groupe: person.blood_type,
    allergies: allergies.map((a) => a.allergen),
    traitements: treatments.map((t) => `${t.medication_name}${t.dosage ? ` ${t.dosage}` : ""}`),
    antecedents: conditions.map((c) => c.condition_name),
    urgence: person.emergency_contact_name
      ? { nom: person.emergency_contact_name, tel: person.emergency_contact_phone }
      : null,
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, JSON.stringify(urgenceData), {
      width: 220,
      margin: 2,
      color: { dark: "#1E6FBF", light: "#FFFFFF" },
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const age = person.date_of_birth
    ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Carte rouge urgence */}
      <div className="bg-red-600 rounded-2xl p-5 text-white space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🆘</span>
          <span className="font-bold text-lg">CARTE D&apos;URGENCE</span>
        </div>

        {/* Identité */}
        <div className="bg-white/20 rounded-xl p-3 space-y-1">
          <p className="font-bold text-xl">{person.first_name} {person.last_name}</p>
          {person.date_of_birth && (
            <p className="text-sm opacity-90">Né(e) le {person.date_of_birth} · {age} ans</p>
          )}
          {person.gender && (
            <p className="text-sm opacity-90">
              {person.gender === "male" ? "Homme" : person.gender === "female" ? "Femme" : "Autre"}
            </p>
          )}
        </div>

        {/* Groupe sanguin */}
        {person.blood_type && (
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Groupe sanguin</p>
            <p className="font-bold text-3xl">{person.blood_type}</p>
          </div>
        )}

        {/* Allergies */}
        {allergies.length > 0 && (
          <div className="bg-yellow-400/30 border border-yellow-300 rounded-xl p-3">
            <p className="text-xs font-bold uppercase tracking-wide mb-1">⚠️ Allergies graves</p>
            {allergies.map((a, i) => (
              <p key={i} className="font-semibold">
                • {a.allergen}
                {a.severity === "life_threatening" && " ⚡ VIE EN DANGER"}
              </p>
            ))}
          </div>
        )}

        {/* Traitements en cours */}
        {treatments.length > 0 && (
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-xs opacity-75 uppercase tracking-wide font-medium mb-1">💊 Traitements en cours</p>
            {treatments.map((t, i) => (
              <p key={i} className="text-sm font-medium">
                • {t.medication_name}{t.dosage ? ` — ${t.dosage}` : ""}
              </p>
            ))}
          </div>
        )}

        {/* Antécédents */}
        {conditions.length > 0 && (
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-xs opacity-75 uppercase tracking-wide font-medium mb-1">🫀 Antécédents médicaux</p>
            {conditions.map((c, i) => (
              <p key={i} className="text-sm font-medium">• {c.condition_name}</p>
            ))}
          </div>
        )}

        {/* Contact d'urgence */}
        {person.emergency_contact_name && (
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-xs opacity-75 uppercase tracking-wide font-medium mb-1">Contact d&apos;urgence</p>
            <p className="font-semibold">{person.emergency_contact_name}</p>
            {person.emergency_contact_phone && (
              <a href={`tel:${person.emergency_contact_phone}`} className="text-yellow-200 font-bold text-lg">
                {person.emergency_contact_phone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="card flex flex-col items-center gap-3 py-6">
        <p className="text-sm font-medium text-gray-700">QR code — données d&apos;urgence complètes</p>
        <canvas ref={canvasRef} className="rounded-xl" />
        <p className="text-xs text-gray-400 text-center">
          Contient : identité · groupe sanguin · allergies · traitements · antécédents · contact d&apos;urgence
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        🔒 Version de démonstration — données fictives. En production, ce QR code sera signé.
      </div>
    </div>
  );
}
