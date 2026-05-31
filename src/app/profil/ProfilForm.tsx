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

interface Props {
  person: Person;
}

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
      {success && (
        <div className="bg-health-green-light border border-health-green rounded-xl p-3 text-sm text-health-green-dark font-medium">
          ✓ Profil mis à jour avec succès
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Identité</h2>
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
          <select name="gender" className="input-field" value={form.gender} onChange={handleChange}>
            <option value="">— Choisir —</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Données médicales</h2>
        <div>
          <label className="label">Groupe sanguin</label>
          <select name="blood_type" className="input-field" value={form.blood_type} onChange={handleChange}>
            <option value="">— Inconnu —</option>
            {BLOOD_TYPES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
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
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Contact d&apos;urgence</h2>
        <div>
          <label className="label">Nom</label>
          <input name="emergency_contact_name" className="input-field" value={form.emergency_contact_name} onChange={handleChange} placeholder="Jean Dupont" />
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
