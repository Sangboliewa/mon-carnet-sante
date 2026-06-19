import Link from "next/link";
import type { Person } from "@/lib/supabase/types";

interface Props {
  person: Person;
}

function bmi(h: number | null, w: number | null): { value: string; label: string; color: string } | null {
  if (!h || !w) return null;
  const b = w / ((h / 100) ** 2);
  const value = b.toFixed(1);
  if (b < 18.5) return { value, label: "Insuffisant", color: "text-blue-400" };
  if (b < 25)   return { value, label: "Normal",      color: "text-green-400" };
  if (b < 30)   return { value, label: "Surpoids",    color: "text-yellow-400" };
  return              { value, label: "Obésité",      color: "text-red-400" };
}

export default function HealthIdCard({ person }: Props) {
  const age = person.date_of_birth
    ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const bmiData = bmi(person.height_cm ?? null, person.weight_kg ?? null);
  const genderIcon = person.gender === "male" ? "♂" : person.gender === "female" ? "♀" : "";

  const missing: { label: string; href: string }[] = [];
  if (!person.blood_type)              missing.push({ label: "Groupe sanguin",   href: "/profil" });
  if (!person.date_of_birth)           missing.push({ label: "Date de naissance", href: "/profil" });
  if (!person.height_cm || !person.weight_kg) missing.push({ label: "Taille & poids", href: "/profil" });
  if (!person.emergency_contact_name) missing.push({ label: "Contact d'urgence",  href: "/profil" });

  return (
    <div className="space-y-3">
      {/* Carte identité médicale */}
      <div className="bg-gradient-to-br from-health-blue via-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
        {/* Décoration cercles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

        {/* Header carte */}
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-widest font-medium mb-1">Mon Carnet Santé</p>
              <p className="text-white text-2xl font-bold leading-tight">
                {person.first_name} {person.last_name ?? ""}
              </p>
              {age && (
                <p className="text-blue-200 text-sm mt-0.5">
                  {genderIcon} {age} ans · Né(e) le {new Date(person.date_of_birth!).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
            {person.blood_type && (
              <div className="bg-white/20 rounded-2xl px-4 py-3 text-center shrink-0">
                <p className="text-blue-200 text-[10px] uppercase tracking-wide">Groupe</p>
                <p className="text-white text-2xl font-black">{person.blood_type}</p>
              </div>
            )}
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-2">
            {person.height_cm && (
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-0.5">Taille</p>
                <p className="text-white font-bold text-lg">{person.height_cm}<span className="text-blue-200 text-xs"> cm</span></p>
              </div>
            )}
            {person.weight_kg && (
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-0.5">Poids</p>
                <p className="text-white font-bold text-lg">{person.weight_kg}<span className="text-blue-200 text-xs"> kg</span></p>
              </div>
            )}
            {bmiData && (
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-0.5">IMC</p>
                <p className={`font-bold text-lg ${bmiData.color}`}>{bmiData.value}</p>
                <p className="text-blue-200 text-[9px]">{bmiData.label}</p>
              </div>
            )}
          </div>

          {/* Contact urgence */}
          {person.emergency_contact_name && (
            <div className="mt-3 bg-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-lg">🚨</span>
              <div>
                <p className="text-blue-200 text-[10px] uppercase tracking-wide">Urgence</p>
                <p className="text-white text-sm font-semibold">
                  {person.emergency_contact_name}
                  {person.emergency_contact_phone && <span className="text-blue-200 font-normal ml-2">{person.emergency_contact_phone}</span>}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Champs manquants */}
      {missing.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            ⚠️ Complète ta carte santé
          </p>
          <div className="space-y-1.5">
            {missing.map((m, i) => (
              <Link key={i} href={m.href} className="flex items-center gap-2 text-sm text-amber-800">
                <div className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0" />
                {m.label}
                <span className="ml-auto text-amber-500 text-xs">Ajouter →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
