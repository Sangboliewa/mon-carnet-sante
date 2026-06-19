"use client";
import { useEffect, useRef, useState } from "react";
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

const EMERGENCY_NUMBERS = [
  { country: "🇨🇮 Côte d'Ivoire", samu: "185", police: "170", pompiers: "180" },
  { country: "🇸🇳 Sénégal",       samu: "15",  police: "17",  pompiers: "18" },
  { country: "🇧🇫 Burkina Faso",  samu: "112", police: "17",  pompiers: "18" },
  { country: "🇲🇱 Mali",          samu: "15",  police: "17",  pompiers: "18" },
  { country: "🇨🇲 Cameroun",      samu: "119", police: "17",  pompiers: "18" },
  { country: "🇨🇬 Congo",         samu: "15",  police: "17",  pompiers: "18" },
  { country: "🇹🇬 Togo",          samu: "15",  police: "17",  pompiers: "18" },
];

export default function UrgenceClient({ person, allergies, treatments, conditions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showNumbers, setShowNumbers] = useState(false);
  const [copied, setCopied] = useState(false);

  const age = person.date_of_birth
    ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const urgenceData = {
    nom: `${person.first_name} ${person.last_name ?? ""}`.trim(),
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
      width: 200,
      margin: 2,
      color: { dark: "#1E3A5F", light: "#FFFFFF" },
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleShare() {
    const text = [
      `🆘 URGENCE — ${urgenceData.nom}`,
      age ? `Âge : ${age} ans` : "",
      urgenceData.groupe ? `Groupe sanguin : ${urgenceData.groupe}` : "",
      urgenceData.allergies.length ? `Allergies : ${urgenceData.allergies.join(", ")}` : "",
      urgenceData.traitements.length ? `Traitements : ${urgenceData.traitements.join(", ")}` : "",
      urgenceData.antecedents.length ? `Antécédents : ${urgenceData.antecedents.join(", ")}` : "",
      urgenceData.urgence ? `Contact d'urgence : ${urgenceData.urgence.nom} — ${urgenceData.urgence.tel}` : "",
    ].filter(Boolean).join("\n");

    if (navigator.share) {
      await navigator.share({ title: "Carte d'urgence", text });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="px-4 py-5 space-y-4">

      {/* Bouton SAMU principal */}
      <a
        href="tel:185"
        className="flex items-center justify-center gap-3 bg-red-600 active:bg-red-700 text-white font-bold text-xl rounded-2xl py-5 shadow-lg shadow-red-200"
      >
        <span className="text-3xl">📞</span>
        APPELER LE SAMU — 185
      </a>

      {/* Carte médicale d'urgence */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 text-white space-y-3 shadow-xl shadow-red-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🆘</span>
            <span className="font-bold text-base tracking-wide uppercase">Carte d&apos;urgence</span>
          </div>
          <button onClick={handleShare} className="bg-white/20 active:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-semibold">
            {copied ? "✅ Copié" : "⬆ Partager"}
          </button>
        </div>

        {/* Identité + groupe */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">Patient</p>
            <p className="font-bold text-lg leading-tight">{person.first_name} {person.last_name}</p>
            {age && <p className="text-sm opacity-85 mt-0.5">{age} ans · {person.date_of_birth}</p>}
            {person.gender && (
              <p className="text-xs opacity-70 mt-0.5">
                {person.gender === "male" ? "Homme" : person.gender === "female" ? "Femme" : "Autre"}
              </p>
            )}
          </div>
          {person.blood_type && (
            <div className="w-24 bg-white/15 rounded-xl p-3 flex flex-col items-center justify-center">
              <p className="text-xs opacity-70 uppercase tracking-wide mb-1">Groupe</p>
              <p className="font-black text-4xl">{person.blood_type}</p>
            </div>
          )}
        </div>

        {/* Allergies */}
        {allergies.length > 0 && (
          <div className="bg-yellow-400/25 border border-yellow-300/50 rounded-xl p-3">
            <p className="text-xs font-bold uppercase tracking-wide mb-1.5">⚠️ Allergies — NE PAS ADMINISTRER</p>
            {allergies.map((a, i) => (
              <p key={i} className="font-semibold text-sm">
                • {a.allergen}
                {a.severity === "life_threatening" && <span className="ml-2 text-yellow-200 font-bold">⚡ VIE EN DANGER</span>}
              </p>
            ))}
          </div>
        )}

        {/* Traitements */}
        {treatments.length > 0 && (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">💊 Traitements en cours</p>
            {treatments.map((t, i) => (
              <p key={i} className="text-sm font-medium">• {t.medication_name}{t.dosage ? ` — ${t.dosage}` : ""}</p>
            ))}
          </div>
        )}

        {/* Antécédents */}
        {conditions.length > 0 && (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">🫀 Antécédents médicaux</p>
            {conditions.map((c, i) => (
              <p key={i} className="text-sm font-medium">• {c.condition_name}</p>
            ))}
          </div>
        )}

        {/* Contact d'urgence */}
        {person.emergency_contact_name ? (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">📞 Contact d&apos;urgence</p>
            <p className="font-semibold">{person.emergency_contact_name}</p>
            {person.emergency_contact_phone && (
              <a href={`tel:${person.emergency_contact_phone}`} className="text-yellow-200 font-bold text-lg block mt-0.5">
                {person.emergency_contact_phone}
              </a>
            )}
          </div>
        ) : (
          <a href="/profil" className="bg-white/10 border border-white/30 rounded-xl p-3 flex items-center gap-2">
            <span className="text-lg">➕</span>
            <span className="text-sm font-medium opacity-90">Ajouter un contact d&apos;urgence</span>
          </a>
        )}
      </div>

      {/* QR Code */}
      <div className="card flex flex-col items-center gap-3 py-6">
        <p className="text-sm font-semibold text-gray-700">QR code — données complètes</p>
        <canvas ref={canvasRef} className="rounded-xl border border-gray-100" />
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Montre ce QR code aux secours · contient toutes les informations médicales ci-dessus
        </p>
      </div>

      {/* Numéros d'urgence par pays */}
      <div className="card">
        <button
          onClick={() => setShowNumbers(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <span className="font-semibold text-gray-800 text-sm">🌍 Numéros d&apos;urgence par pays</span>
          <span className="text-gray-400 text-xs">{showNumbers ? "▲" : "▼"}</span>
        </button>

        {showNumbers && (
          <div className="mt-3 space-y-2">
            {EMERGENCY_NUMBERS.map((n, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <p className="font-semibold text-sm text-gray-800 mb-1.5">{n.country}</p>
                <div className="flex gap-2">
                  <a href={`tel:${n.samu}`} className="flex-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-red-500 font-medium">SAMU</p>
                    <p className="font-bold text-red-700 text-base">{n.samu}</p>
                  </a>
                  <a href={`tel:${n.police}`} className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-blue-500 font-medium">Police</p>
                    <p className="font-bold text-blue-700 text-base">{n.police}</p>
                  </a>
                  <a href={`tel:${n.pompiers}`} className="flex-1 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-orange-500 font-medium">Pompiers</p>
                    <p className="font-bold text-orange-700 text-base">{n.pompiers}</p>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-center text-gray-400 pb-2">
        Ces données sont stockées localement et chiffrées · Mon Carnet Santé
      </p>
    </div>
  );
}
