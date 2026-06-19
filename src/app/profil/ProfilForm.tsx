"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/supabase/types";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = [
  { value: "male", label: "Masculin" },
  { value: "female", label: "Féminin" },
  { value: "other", label: "Autre" },
];
const PROFILE_FIELDS = [
  "first_name", "last_name", "date_of_birth", "gender",
  "blood_type", "height_cm", "weight_kg",
  "emergency_contact_name", "emergency_contact_phone",
] as const;

function calcBMI(h: string, w: string): number | null {
  const hm = parseFloat(h) / 100;
  const wk = parseFloat(w);
  if (!hm || !wk || hm < 0.5 || wk < 5) return null;
  return Math.round((wk / (hm * hm)) * 10) / 10;
}

function bmiCategory(bmi: number): { label: string; cls: string } {
  if (bmi < 18.5) return { label: "Insuffisance pondérale", cls: "text-blue-700 bg-blue-50 border-blue-200" };
  if (bmi < 25)   return { label: "Poids normal ✓",         cls: "text-green-700 bg-green-50 border-green-200" };
  if (bmi < 30)   return { label: "Surpoids",               cls: "text-amber-700 bg-amber-50 border-amber-200" };
  return                  { label: "Obésité",                cls: "text-red-700 bg-red-50 border-red-200" };
}

interface Props { person: Person }

export default function ProfilForm({ person }: Props) {
  const [form, setForm] = useState({
    first_name: person.first_name ?? "",
    last_name: person.last_name ?? "",
    date_of_birth: person.date_of_birth ?? "",
    gender: person.gender ?? "",
    blood_type: person.blood_type ?? "",
    height_cm: person.height_cm?.toString() ?? "",
    weight_kg: person.weight_kg?.toString() ?? "",
    emergency_contact_name: person.emergency_contact_name ?? "",
    emergency_contact_phone: person.emergency_contact_phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  const filled = PROFILE_FIELDS.filter((k) => !!form[k]).length;
  const pct = Math.round((filled / PROFILE_FIELDS.length) * 100);
  const bmi = calcBMI(form.height_cm, form.weight_kg);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("persons")
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_type: form.blood_type || null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
      })
      .eq("id", person.id);
    setSaving(false);
    if (updateError) {
      setError("Erreur lors de la sauvegarde : " + updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Completeness */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-gray-700">Complétude du profil</p>
          <p className="text-sm font-bold text-health-blue">{pct}%</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "#22c55e" : "linear-gradient(to right, #2563eb, #60a5fa)",
            }}
          />
        </div>
        {pct < 100 && (
          <p className="text-xs text-gray-400 mt-1.5">
            {PROFILE_FIELDS.length - filled} champ{PROFILE_FIELDS.length - filled > 1 ? "s" : ""} manquant{PROFILE_FIELDS.length - filled > 1 ? "s" : ""} — complète ton profil pour un meilleur suivi
          </p>
        )}
      </div>

      {success && (
        <div className="bg-health-green-light border border-health-green rounded-xl p-3 text-sm text-health-green-dark font-medium">
          ✓ Profil mis à jour avec succès
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Identité */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
          <span>👤</span> Identité
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom</label>
            <input name="first_name" className="input-field" value={form.first_name} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Nom</label>
            <input name="last_name" className="input-field" value={form.last_name} onChange={handleChange} required />
          </div>
        </div>
        <div>
          <label className="label">Date de naissance</label>
          <input name="date_of_birth" type="date" className="input-field" value={form.date_of_birth} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Genre</label>
          <div className="flex gap-2 mt-1">
            {GENDERS.map((g) => (
              <button key={g.value} type="button"
                onClick={() => setForm((f) => ({ ...f, gender: f.gender === g.value ? "" : g.value }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form.gender === g.value ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Données médicales */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
          <span>🩺</span> Données médicales
        </h2>
        <div>
          <label className="label">Groupe sanguin</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {BLOOD_TYPES.map((b) => (
              <button key={b} type="button"
                onClick={() => setForm((f) => ({ ...f, blood_type: f.blood_type === b ? "" : b }))}
                className={`w-14 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.blood_type === b ? "bg-red-500 text-white border-red-500 shadow-sm scale-105" : "bg-white text-gray-700 border-gray-200"}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Taille (cm)</label>
            <input name="height_cm" type="number" min="50" max="250" className="input-field" value={form.height_cm} onChange={handleChange} placeholder="170" />
          </div>
          <div>
            <label className="label">Poids (kg)</label>
            <input name="weight_kg" type="number" min="1" max="500" step="0.1" className="input-field" value={form.weight_kg} onChange={handleChange} placeholder="70" />
          </div>
        </div>
        {bmi !== null && (() => {
          const cat = bmiCategory(bmi);
          return (
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${cat.cls}`}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">IMC calculé</p>
                <p className="font-semibold text-sm mt-0.5">{cat.label}</p>
              </div>
              <p className="text-3xl font-black">{bmi}</p>
            </div>
          );
        })()}
      </div>

      {/* Contact d'urgence */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
          <span>🚨</span> Contact d&apos;urgence
        </h2>
        <div>
          <label className="label">Nom</label>
          <input name="emergency_contact_name" className="input-field" value={form.emergency_contact_name} onChange={handleChange} placeholder="Nom complet" />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input name="emergency_contact_phone" type="tel" className="input-field" value={form.emergency_contact_phone} onChange={handleChange} placeholder="+225 07 00 00 00 00" />
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Enregistrement…" : "Enregistrer le profil"}
      </button>
    </form>
  );
}
