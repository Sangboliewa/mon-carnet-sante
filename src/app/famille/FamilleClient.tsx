"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PersonRow } from "@/lib/supabase/types";
import { useLang } from "@/lib/i18n/LanguageContext";

async function createInviteLink(personId: string): Promise<string | null> {
  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person_id: personId }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { link: string };
  return json.link;
}

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
const AVATAR_GRADIENT: Record<string, string> = {
  moi: "from-blue-500 to-blue-600",
  conjoint: "from-pink-500 to-rose-500",
  enfant: "from-green-500 to-teal-500",
  parent: "from-amber-500 to-orange-500",
  autre: "from-gray-400 to-gray-500",
};

interface PersonWithRole extends PersonRow { role: string }

interface Props {
  userId: string;
  persons: PersonWithRole[];
  activePersonId: string;
}

function decodeAvatar(emoji: string | null, fallback: string): string {
  if (!emoji) return fallback;
  const match = emoji?.match(/^u\{([0-9A-Fa-f]+)\}$/) ?? null;
  if (match) return String.fromCodePoint(parseInt(match[1], 16));
  return emoji;
}

function ageLabel(dob: string | null): string {
  if (!dob) return "";
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  if (years < 2) {
    const months = Math.floor(ms / (30.44 * 24 * 3600 * 1000));
    return months + " mois";
  }
  return years + " ans";
}

function AvatarDisplay({ photoUrl, emoji, fallback, size = "md", gradient }: {
  photoUrl?: string | null;
  emoji?: string | null;
  fallback: string;
  size?: "sm" | "md" | "lg";
  gradient: string;
}) {
  const sizeClass = size === "lg" ? "w-16 h-16 text-3xl" : size === "sm" ? "w-10 h-10 text-xl" : "w-12 h-12 text-2xl";
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
      <span>{decodeAvatar(emoji ?? null, fallback)}</span>
    </div>
  );
}

export default function FamilleClient({ userId, persons: initialPersons, activePersonId }: Props) {
  const router = useRouter();
  const { t } = useLang();
  const [active, setActive] = useState(activePersonId);
  const [list, setList] = useState<PersonWithRole[]>(initialPersons);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "",
    gender: "", blood_type: "", relation: "autre",
    nickname: "", avatar_emoji: "👤", avatar_photo_url: "" as string,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  function switchTo(personId: string) {
    document.cookie = "active_person_id=" + personId + "; path=/; max-age=31536000; SameSite=Lax";
    setActive(personId);
    router.push("/dashboard");
    router.refresh();
  }

  function openAdd() {
    setEditingId(null);
    setForm({ first_name: "", last_name: "", date_of_birth: "", gender: "", blood_type: "", relation: "autre", nickname: "", avatar_emoji: "👤", avatar_photo_url: "" });
    setPhotoPreview(null);
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
      avatar_photo_url: p.avatar_photo_url ?? "",
    });
    setPhotoPreview(p.avatar_photo_url ?? null);
    setError(null);
    setShowForm(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Photo trop lourde (max 5 Mo)"); return; }

    setUploading(true);
    setError(null);

    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm(f => ({ ...f, avatar_photo_url: data.publicUrl }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("uploadError"));
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setPhotoPreview(null);
    setForm(f => ({ ...f, avatar_photo_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      avatar_photo_url: form.avatar_photo_url || null,
    };
    if (editingId) {
      const { error: err } = await supabase.from("persons").update(payload).eq("id", editingId);
      if (err) { setError(err.message); setSaving(false); return; }
      setList(prev => prev.map(p => p.id === editingId ? { ...p, ...payload } : p));
    } else {
      const { data, error: err } = await supabase.from("persons").insert({ ...payload, created_by: userId }).select().single();
      if (err || !data) { setError(err?.message ?? t("error")); setSaving(false); return; }
      setList(prev => [...prev, { ...(data as PersonRow), role: "owner" } as PersonWithRole]);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteFamilyConfirm"))) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("persons").delete().eq("id", id);
    if (err) { setError(err.message); return; }
    const remaining = list.filter(p => p.id !== id);
    setList(remaining);
    if (active === id) { const next = remaining[0]; if (next) switchTo(next.id); }
  }

  return (
    <div>
      {/* Avatar row */}
      <div className="px-4 py-5 bg-gradient-to-b from-violet-50 to-white border-b border-violet-100">
        <div className="flex items-end gap-4 overflow-x-auto pb-1">
          {list.map((p) => (
            <button key={p.id} onClick={() => switchTo(p.id)}
              className={"flex-shrink-0 flex flex-col items-center gap-1.5 transition-all " + (active === p.id ? "scale-110" : "opacity-55")}>
              <div className={"relative ring-2 rounded-full " + (active === p.id ? "ring-violet-500 ring-offset-2" : "ring-transparent")}>
                <AvatarDisplay
                  photoUrl={p.avatar_photo_url}
                  emoji={p.avatar_emoji}
                  fallback={p.first_name[0]}
                  size="lg"
                  gradient={AVATAR_GRADIENT[p.relation ?? "autre"] ?? AVATAR_GRADIENT.autre}
                />
              </div>
              <p className="text-xs font-medium text-gray-700 max-w-[52px] truncate">{p.nickname ?? p.first_name}</p>
              {active === p.id && <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
            </button>
          ))}
          {!showForm && (
            <button onClick={openAdd} className="flex-shrink-0 flex flex-col items-center gap-1.5 opacity-50">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400">+</div>
              <p className="text-xs text-gray-400">{t("add")}</p>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3">{list.length} profil{list.length > 1 ? "s" : ""} — Appuie sur un avatar pour changer de profil actif</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        <div className="space-y-3">
          {list.map((p) => {
            const relationLabel = RELATIONS.find(r => r.value === (p.relation ?? "autre"))?.label ?? "Autre";
            const isMoi = p.relation === "moi";
            return (
              <div key={p.id} className={"card flex items-center gap-3 border-2 transition-colors " + (active === p.id ? "border-violet-400 bg-violet-50/30" : "border-gray-100")}>
                <AvatarDisplay
                  photoUrl={p.avatar_photo_url}
                  emoji={p.avatar_emoji}
                  fallback={p.first_name[0]}
                  size="md"
                  gradient={AVATAR_GRADIENT[p.relation ?? "autre"] ?? AVATAR_GRADIENT.autre}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{p.nickname ? p.nickname + " (" + p.first_name + ")" : p.first_name + " " + (p.last_name ?? "")}</p>
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (RELATION_COLORS[p.relation ?? "autre"] ?? "bg-gray-100 text-gray-700")}>{relationLabel}</span>
                    {isMoi && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-medium">Vous</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    {p.date_of_birth && <p className="text-xs text-gray-500">{ageLabel(p.date_of_birth)}</p>}
                    {p.blood_type && <p className="text-xs font-medium text-red-600">{p.blood_type}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end flex-shrink-0">
                  {active === p.id ? (
                    <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-1 rounded-lg">Actif</span>
                  ) : (
                    <button onClick={() => switchTo(p.id)} className="text-xs font-medium text-violet-700 border border-violet-400 px-3 py-1.5 rounded-xl">Choisir</button>
                  )}
                  <button onClick={() => openEdit(p)} className="text-xs text-gray-400">{t("edit")}</button>
                  <button
                    onClick={async () => {
                      setInviting(p.id); setInviteLink(null); setInviteCopied(false);
                      const link = await createInviteLink(p.id);
                      setInviting(null);
                      if (link) {
                        setInviteLink(link);
                        if (navigator.share) navigator.share({ title: "Invitation carnet santé", url: link }).catch(()=>{});
                        else { navigator.clipboard.writeText(link); setInviteCopied(true); }
                      }
                    }}
                    disabled={inviting === p.id}
                    className="text-xs text-indigo-500"
                  >
                    {inviting === p.id ? "…" : "🔗 Inviter"}
                  </button>
                  {!isMoi && <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400">{t("delete")}</button>}
                </div>
              </div>
            );
          })}
        </div>

        {inviteLink && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-indigo-800">🔗 Lien d&apos;invitation généré</p>
            <p className="text-xs text-indigo-600 break-all">{inviteLink}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteLink); setInviteCopied(true); }}
              className="text-xs font-medium text-indigo-700 border border-indigo-300 px-3 py-1.5 rounded-lg"
            >
              {inviteCopied ? "✅ Copié !" : "Copier le lien"}
            </button>
            <p className="text-xs text-indigo-400">Valide 7 jours · 1 utilisation</p>
          </div>
        )}

        {!showForm && <button onClick={openAdd} className="btn-primary">{t("addFamilyMember")}</button>}

        {showForm && (
          <form onSubmit={handleSubmit} className="card space-y-4 border-violet-400 border-2">
            <h3 className="font-bold text-gray-900">{editingId ? t("editProfile") : t("newMember")}</h3>

            {/* Photo de profil */}
            <div>
              <label className="label">Photo de profil</label>
              <div className="flex items-center gap-4 mt-1">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-violet-300" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-3xl">
                      {decodeAvatar(form.avatar_emoji, "👤")}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-sm font-medium text-violet-700 border border-violet-400 px-3 py-1.5 rounded-xl disabled:opacity-50"
                  >
                    {uploading ? "Upload…" : photoPreview ? "Changer la photo" : "Ajouter une photo"}
                  </button>
                  {photoPreview && (
                    <button type="button" onClick={removePhoto} className="text-xs text-red-500 text-left">
                      Supprimer la photo
                    </button>
                  )}
                  <p className="text-xs text-gray-400">JPG, PNG · max 5 Mo</p>
                </div>
              </div>
            </div>

            {/* Avatar emoji (si pas de photo) */}
            {!photoPreview && (
              <div>
                <label className="label">Ou choisir un avatar</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {AVATARS.map(e => (
                    <button key={e} type="button" onClick={() => setForm(f => ({ ...f, avatar_emoji: e }))}
                      className={"text-2xl p-1.5 rounded-xl border-2 transition-all " + (form.avatar_emoji === e ? "border-violet-500 bg-violet-50" : "border-gray-200")}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Prénom *</label><input name="first_name" required className="input-field" value={form.first_name} onChange={handleChange} /></div>
              <div><label className="label">Nom</label><input name="last_name" className="input-field" value={form.last_name} onChange={handleChange} /></div>
            </div>
            <div><label className="label">Surnom</label><input name="nickname" className="input-field" placeholder="ex: Mamie, Bébé…" value={form.nickname} onChange={handleChange} /></div>
            <div>
              <label className="label">Lien de parenté *</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {RELATIONS.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => setForm(f => ({ ...f, relation: r.value }))}
                    className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all ${form.relation === r.value ? "border-violet-500 bg-violet-50 text-violet-800" : "border-gray-100 text-gray-600"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="label">Date de naissance</label><input name="date_of_birth" type="date" className="input-field" value={form.date_of_birth} onChange={handleChange} /></div>
            <div>
              <label className="label">Genre</label>
              <div className="flex gap-2 mt-1">
                {([["","—"],["male","Masculin"],["female","Féminin"],["other","Autre"]] as const).map(([v,l]) => (
                  <button key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, gender: v }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-medium transition-all ${form.gender === v ? "border-violet-500 bg-violet-50 text-violet-800" : "border-gray-100 text-gray-600"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Groupe sanguin</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {BLOOD_TYPES.map(b => (
                  <button key={b} type="button"
                    onClick={() => setForm(f => ({ ...f, blood_type: f.blood_type === b ? "" : b }))}
                    className={`py-2 rounded-xl border-2 text-sm font-bold transition-all ${form.blood_type === b ? "border-red-500 bg-red-500 text-white" : "border-gray-200 text-gray-700"}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary">{t("cancel")}</button>
              <button type="submit" disabled={saving || uploading} className="btn-primary">{saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer le profil"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
