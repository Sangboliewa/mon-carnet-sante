"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = [
  { value: "male", label: "Masculin" },
  { value: "female", label: "Féminin" },
  { value: "other", label: "Autre" },
];

export default function CreateProfilForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    blood_type: "",
    height_cm: "",
    weight_kg: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) { setError("Le prénom est requis."); return; }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expirée. Reconnectez-vous."); setSaving(false); return; }

    // 1. Créer la personne
    const { data: newPerson, error: insertErr } = await supabase
      .from("persons")
      .insert({
        created_by: user.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_type: form.blood_type || null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
      })
      .select("id")
      .single();

    if (insertErr || !newPerson) {
      setError("Erreur lors de la création : " + (insertErr?.message ?? "inconnue"));
      setSaving(false);
      return;
    }

    // 2. Créer l'accès propriétaire
    await supabase.from("person_access").insert({
      person_id: newPerson.id,
      user_id: user.id,
      role: "owner",
    });

    // 3. Définir comme profil actif via cookie
    document.cookie = `active_person_id=${newPerson.id}; path=/; max-age=31536000`;

    // 4. Navigation client-side — vers l'onboarding guidé
    router.refresh();
    router.push("/bienvenue");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Créez votre profil de santé</span><br />
          Ces informations permettent à Mon Carnet Santé de personnaliser vos données médicales.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Identité</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom *</label>
            <input name="first_name" className="input-field" value={form.first_name} onChange={handleChange} required placeholder="Votre prénom" />
          </div>
          <div>
            <label className="label">Nom</label>
            <input name="last_name" className="input-field" value={form.last_name} onChange={handleChange} placeholder="Votre nom" />
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
          <input name="emergency_contact_name" className="input-field" value={form.emergency_contact_name} onChange={handleChange} placeholder="Nom complet" />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input name="emergency_contact_phone" type="tel" className="input-field" value={form.emergency_contact_phone} onChange={handleChange} placeholder="+225 07 00 00 00 00" />
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Création en cours…" : "✅ Créer mon profil"}
      </button>
    </form>
  );
}
