"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Person, PersonInsert } from "@/lib/supabase/types";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ROLE_LABEL: Record<string, string> = { owner: "Titulaire", editor: "Éditeur", viewer: "Lecteur" };
const ROLE_COLOR: Record<string, string> = {
  owner:  "bg-blue-100 text-blue-700",
  editor: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-500",
};

interface PersonWithRole extends Person { role: string }

interface Props {
  userId: string;
  persons: PersonWithRole[];
  activePersonId: string;
}

export default function FamilleClient({ userId, persons, activePersonId }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(activePersonId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<PersonInsert, "created_by">>({
    first_name: "", last_name: "", date_of_birth: null,
    gender: null, blood_type: null,
  });
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<PersonWithRole[]>(persons);

  function switchTo(personId: string) {
    document.cookie = `active_person_id=${personId}; path=/; max-age=31536000; SameSite=Lax`;
    setActive(personId);
    router.push("/dashboard");
    router.refresh();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("persons")
      .insert({ ...form, created_by: userId })
      .select()
      .single();
    setSaving(false);
    if (data) {
      setList((prev) => [...prev, { ...data, role: "owner" }]);
      setForm({ first_name: "", last_name: "", date_of_birth: null, gender: null, blood_type: null });
      setShowForm(false);
    }
  }

  function ageLabel(dob: string | null): string {
    if (!dob) return "";
    const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    if (years < 2) {
      const months = Math.floor((Date.now() - new Date(dob).getTime()) / (30.44 * 24 * 3600 * 1000));
      return `${months} mois`;
    }
    return `${years} ans`;
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="card bg-blue-50 border-blue-100 text-sm text-blue-800">
        Gérez les profils de votre famille. Chaque profil a son propre carnet de santé indépendant.
      </div>

      {/* Liste des profils */}
      <div className="space-y-3">
        {list.map((p) => (
          <div key={p.id} className={`card flex items-center gap-3 border-2 transition-colors ${active === p.id ? "border-health-blue" : "border-gray-100"}`}>
            <div className="w-12 h-12 rounded-full bg-health-blue-light flex items-center justify-center text-lg font-bold text-health-blue flex-shrink-0">
              {p.first_name[0]}{p.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {p.date_of_birth && <p className="text-xs text-gray-500">{ageLabel(p.date_of_birth)}</p>}
                {p.blood_type && <p className="text-xs font-medium text-red-600">{p.blood_type}</p>}
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLOR[p.role]}`}>{ROLE_LABEL[p.role]}</span>
              </div>
            </div>
            {active === p.id ? (
              <span className="text-xs font-semibold text-health-blue bg-health-blue-light px-2 py-1 rounded-lg flex-shrink-0">Actif</span>
            ) : (
              <button onClick={() => switchTo(p.id)} className="text-xs font-medium text-health-blue border border-health-blue px-3 py-1.5 rounded-xl flex-shrink-0">
                Choisir
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
        {showForm ? "Annuler" : "+ Ajouter un membre de la famille"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input name="first_name" required className="input-field" value={form.first_name} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input name="last_name" required className="input-field" value={form.last_name} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Date de naissance</label>
            <input name="date_of_birth" type="date" className="input-field" value={form.date_of_birth ?? ""} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Genre</label>
              <select name="gender" className="input-field" value={form.gender ?? ""} onChange={handleChange}>
                <option value="">—</option>
                <option value="male">Masculin</option>
                <option value="female">Féminin</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="label">Groupe sanguin</label>
              <select name="blood_type" className="input-field" value={form.blood_type ?? ""} onChange={handleChange}>
                <option value="">—</option>
                {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Création…" : "Créer le profil"}
          </button>
        </form>
      )}
    </div>
  );
}
