"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PersonRow } from "@/lib/supabase/types";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const AVATARS = ["👨", "👩", "👦", "👧", "👴", "👵", "🧑", "👶", "🧒", "👤"];
const RELATIONS = [
  { value: "moi", label: "Moi-même" },
  { value: "conjoint", label: "Conjoint(e)" },
  { value: "enfant", label: "Enfant" },
  { value: "parent", label: "Parent" },
  { value: "autre", label: "Autre" },
];
const RELATION_COLORS: Record<string, string> = {
  moi: "bg-blue-100 text-blue-800",
  conjoint: "bg-pink-100 text-pink-800",
  enfant: "bg-green-100 text-green-800",
  parent: "bg-amber-100 text-amber-800",
  autre: "bg-gray-100 text-gray-700",
};

interface PersonWithRole extends PersonRow { role: string }

interface Props {
  userId: string;
  persons: PersonWithRole[];
  activePersonId: string;
}

function ageLabel(dob: string | null): string {
  if (!dob) return "";
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  if (years < 2) {
    const months = Math.floor(ms / (30.44 * 24 * 3600 * 1000));
    return `${months} mois`;
  }
  return `${years} ans`;
}

export default function FamilleClient({ userId, persons: initialPersons, activePersonId }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(activePersonId);
  const [list, setList] = useState<PersonWithRole[]>(initialPersons);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "",
    gender: "", blood_type: "", relation: "autre",
    nickname: "", avatar_emoji: "👤",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchTo(personId: string) {
    document.cookie = `active_person_id=${personId}; path=/; max-age=31536000; SameSite=Lax`;
    setActive(personId);
    router.push("/dashboard");
    router.refresh();
  }

  function openAdd() {
    setEditingId(null);
    setForm({ first_name: "", last_name: "", date_of_birth: "", gender: "", blood_type: "", relation: "autre", nickname: "", avatar_emoji: "👤" });
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: PersonWithRole) {
    setEditingId(p.id);
    setForm({
      first_name: p.first_name,
      last_name: p.last_name ?? "",
      date_of_birth: p.date_of_birth ?? "",
      gender: p.gender ?? "",
      blood_type: p.blood_type ?? "",
      relation: p.relation ?? "autre",
      nickname: p.nickname ?? "",
      avatar_emoji: p.avatar_emoji ?? "👤",
    });
    setError(null);
    setShowForm(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const supabase = createClient();

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      blood_type: form.blood_type || null,
      relation: form.relation || null,
      nickname: form.nickname || null,
      avatar_emoji: form.avatar_emoji || "👤",
    };

    if (editingId) {
      const { error: err } = await supabase.from("persons").update(payload).eq("id", editingId);
      if (err) { setError(err.message); setSaving(false); return; }
      setList(prev => prev.map(p => p.id === editingId ? { ...p, ...payload } : p));
    } else {
      const { data, error: err } = await supabase
        .from("persons")
        .insert({ ...payload, created_by: userId })
        .select().single();
      if (err || !data) { setError(err?.message ?? "Erreur"); setSaving(false); return; }
      setList(prev => [...prev, { ...(data as PersonRow), role: "owner" } as PersonWithRole]);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce profil ? Toutes ses données médicales seront effacées.")) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("persons").delete().eq("id", id);
    if (err) { setError(err.message); return; }
    setList(prev => prev.filter(p => p.id !== id));
    if (active === id) switchTo(list.find(p => p.id !== id)?.id ?? "");
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="card bg-blue-50 border-blue-100 text-sm text-blue-800">
        Gérez les profils de votre famille. Chaque profil a son propre carnet de santé.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {list.map((p) => {
          const relationLabel = RELATIONS.find(r => r.value === (p.relation ?? "autre"))?.label ?? "Autre";
          const isMoi = p.relation === "moi";
          return (
            <div key={p.id} className={`card flex items-center gap-3 border-2 transition-colors ${active === p.id ? "border-health-blue" : "border-gray-100"}`}>
              {/* Avatar */}
              <div className="w-13 h-13 w-12 h-12 rounded-full bg-health-blue-light flex items-center justify-center text-2xl flex-shrink-0">
                {p.avatar_emoji ?? p.first_name[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">
                    {p.nickname ? `${p.nickname} (${p.first_name})` : `${p.first_name} ${p.last_name ?? ""}`}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATION_COLORS[p.relation ?? "autre"] ?? "bg-gray-100 text-gray-700"}`}>
                    {relationLabel}
                  </span>
                  {isMoi && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-medium">Vous</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {p.date_of_birth && <p className="text-xs text-gray-500">{ageLabel(p.date_of_birth)}</p>}
                  {p.blood_type && <p className="text-xs font-medium text-red-600">{p.blood_type}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                {active === p.id ? (
                  <span className="text-xs font-semibold text-health-blue bg-health-blue-light px-2 py-1 rounded-lg">Actif</span>
                ) : (
                  <button onClick={() => switchTo(p.id)} className="text-xs font-medium text-health-blue border border-health-blue px-3 py-1.5 rounded-xl">
                    Choisir
                  </button>
                )}
                <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-gray-600">Modifier</button>
                {!isMoi && (
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-600">Supprimer</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!showForm && (
        <button onClick={openAdd} className="btn-primary">+ Ajouter un membre de la famille</button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-health-blue border-2">
          <h3 className="font-bold text-gray-900">{editingId ? "Modifier le profil" : "Nouveau membre"}</h3>

          {/* Avatar */}
          <div>
            <label className="label">Avatar</label>
            <div className="flex gap-2 flex-wrap">
              {AVATARS.map(e => (
                <button key={e} type="button"
                  onClick={() => setForm(f => ({ ...f, avatar_emoji: e }))}
                  className={`text-2xl p-1.5 rounded-xl border-2 transition-all ${form.avatar_emoji === e ? "border-health-blue bg-health-blue-light" : "border-gray-200"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input name="first_name" required className="input-field" value={form.first_name} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Nom</label>
              <input name="last_name" className="input-field" value={form.last_name} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label className="label">Surnom</label>
            <input name="nickname" className="input-field" placeholder="ex: Mamie, Bébé…" value={form.nickname} onChange={handleChange} />
          </div>

          <div>
            <label className="label">Lien de parenté *</label>
            <select name="relation" required className="input-field" value={form.relation} onChange={handleChange}>
              {RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Date de naissance</label>
            <input name="date_of_birth" type="date" className="input-field" value={form.date_of_birth} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Genre</label>
              <select name="gender" className="input-field" value={form.gender} onChange={handleChange}>
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="label">Groupe sanguin</label>
              <select name="blood_type" className="input-field" value={form.blood_type} onChange={handleChange}>
                <option value="">—</option>
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer le profil"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
