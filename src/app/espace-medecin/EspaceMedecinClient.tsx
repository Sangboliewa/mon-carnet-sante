"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

interface DoctorProfile {
  id: string;
  user_id: string;
  name: string;
  specialty: string | null;
  license_number: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  created_at: string;
}

interface Patient {
  linkId: string;
  personId: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

interface Props {
  userId: string;
  hasProfile: boolean;
  profile: DoctorProfile | null;
  patients: Patient[];
  pendingLinks: Patient[];
}

export default function EspaceMedecinClient({ userId, hasProfile, profile, patients, pendingLinks }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewDoctor = searchParams.get("new") === "1";
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [invitePersonId, setInvitePersonId] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: profile?.name ?? "",
    specialty: profile?.specialty ?? "",
    license_number: profile?.license_number ?? "",
    phone: profile?.phone ?? "",
    address: profile?.address ?? "",
    bio: profile?.bio ?? "",
  });

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("doctor_profiles").insert({
      user_id: userId,
      name: form.name.trim(),
      specialty: form.specialty.trim() || null,
      license_number: form.license_number.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      bio: form.bio.trim() || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("doctor_profiles").update({
      name: form.name.trim(),
      specialty: form.specialty.trim() || null,
      license_number: form.license_number.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      bio: form.bio.trim() || null,
    }).eq("id", profile.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowEdit(false);
    router.refresh();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !invitePersonId.trim()) return;
    setInviteSending(true);
    setInviteMsg("");
    const { error: err } = await supabase.from("doctor_patient_links").insert({
      doctor_id: profile.id,
      person_id: invitePersonId.trim(),
      invited_by: userId,
      status: "pending",
    });
    setInviteSending(false);
    if (err) { setInviteMsg(err.message); return; }
    setInviteMsg(t("Invitation envoyée.", "Invitation sent."));
    setInvitePersonId("");
  }

  function copyPersonId() {
    if (!profile) return;
    navigator.clipboard.writeText(profile.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const ProfileFormFields = ({ onSubmit, btnLabel }: { onSubmit: (e: React.FormEvent) => void; btnLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t("Nom complet", "Full name")} *</label>
        <input className="input-field" required value={form.name} onChange={e => setField("name", e.target.value)} placeholder={t("Dr. Awa Diallo", "Dr. Awa Diallo")} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t("Spécialité", "Specialty")}</label>
        <input className="input-field" value={form.specialty} onChange={e => setField("specialty", e.target.value)} placeholder={t("Médecine générale", "General medicine")} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t("N° Ordre", "License number")}</label>
        <input className="input-field" value={form.license_number} onChange={e => setField("license_number", e.target.value)} placeholder="CI-2024-XXXX" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t("Téléphone", "Phone")}</label>
        <input className="input-field" type="tel" value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+225 07 00 00 00" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t("Adresse du cabinet", "Practice address")}</label>
        <input className="input-field" value={form.address} onChange={e => setField("address", e.target.value)} placeholder={t("Abidjan, Cocody…", "Abidjan, Cocody…")} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t("Bio / Présentation", "Bio / Presentation")}</label>
        <textarea className="input-field resize-none" rows={3} value={form.bio} onChange={e => setField("bio", e.target.value)} placeholder={t("Quelques mots sur votre pratique…", "A few words about your practice…")} />
      </div>
      <button type="submit" disabled={saving} className="w-full py-3 bg-blue-700 text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
        {saving ? t("Enregistrement…", "Saving…") : btnLabel}
      </button>
    </form>
  );

  if (!hasProfile) {
    return (
      <div>
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 px-4 pt-12 pb-8">
          <Link href="/dashboard" className="text-blue-200 text-sm flex items-center gap-1 mb-4">
            ← {t("Tableau de bord", "Dashboard")}
          </Link>
          <h1 className="text-white text-2xl font-bold">👨‍⚕️ {t("Espace médecin", "Doctor space")}</h1>
          <p className="text-blue-200 text-sm mt-1">{t("Créez votre profil professionnel", "Create your professional profile")}</p>
        </div>
        <div className="px-4 py-6">
          {isNewDoctor && (
            <div className="card mb-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
              <p className="text-lg font-bold text-indigo-800 mb-1">🎉 {t("Bienvenue dans Mon Carnet Santé !", "Welcome to Mon Carnet Santé!")}</p>
              <p className="text-sm text-indigo-700">
                {t("Votre compte médecin est créé. Renseignez votre profil pour commencer à suivre vos patients et rédiger des ordonnances.", "Your doctor account is created. Fill in your profile to start managing patients and writing prescriptions.")}
              </p>
            </div>
          )}
          {!isNewDoctor && (
            <div className="card mb-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-800">
                {t("Enregistrez-vous en tant que médecin pour accéder à votre espace dédié et gérer vos patients.", "Register as a doctor to access your dedicated space and manage your patients.")}
              </p>
            </div>
          )}
          <ProfileFormFields onSubmit={handleRegister} btnLabel={t("Créer mon profil médecin", "Create my doctor profile")} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 px-4 pt-12 pb-8">
        <Link href="/dashboard" className="text-blue-200 text-sm flex items-center gap-1 mb-4">
          ← {t("Tableau de bord", "Dashboard")}
        </Link>
        <h1 className="text-white text-2xl font-bold">👨‍⚕️ {t("Espace médecin", "Doctor space")}</h1>
        <p className="text-blue-200 text-sm mt-1">{profile!.specialty ?? t("Médecin", "Doctor")}</p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Profile card */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900 text-lg">{profile!.name}</p>
              {profile!.specialty && <p className="text-sm text-blue-700 font-medium">{profile!.specialty}</p>}
              {profile!.license_number && <p className="text-xs text-gray-500 mt-0.5">{t("N° Ordre :", "License:")} {profile!.license_number}</p>}
              {profile!.phone && <p className="text-xs text-gray-500">{profile!.phone}</p>}
              {profile!.address && <p className="text-xs text-gray-500">{profile!.address}</p>}
            </div>
            <button onClick={() => setShowEdit(v => !v)} className="text-xs text-blue-600 font-medium border border-blue-200 px-3 py-1.5 rounded-lg">
              {showEdit ? t("Fermer", "Close") : t("Modifier", "Edit")}
            </button>
          </div>
          {profile!.bio && <p className="text-sm text-gray-600 mt-2">{profile!.bio}</p>}
        </div>

        {/* Edit profile form */}
        {showEdit && (
          <div className="card border-blue-200 bg-blue-50">
            <p className="section-title mb-3">{t("Modifier le profil", "Edit profile")}</p>
            <ProfileFormFields onSubmit={handleUpdate} btnLabel={t("Enregistrer les modifications", "Save changes")} />
          </div>
        )}

        {/* Invite patient */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="section-title">{t("Inviter un patient", "Invite a patient")}</h2>
            <button onClick={() => setShowInvite(v => !v)} className="text-xs text-blue-600 font-medium border border-blue-200 px-3 py-1.5 rounded-lg">
              {showInvite ? t("Fermer", "Close") : t("+ Inviter", "+ Invite")}
            </button>
          </div>

          {showInvite && (
            <div className="card border-indigo-200 bg-indigo-50 space-y-3">
              <div className="bg-white rounded-xl p-3 border border-indigo-100">
                <p className="text-xs text-gray-500 mb-1">{t("Dites à votre patient de partager son ID :", "Tell your patient to share their ID:")}</p>
                <p className="text-sm font-mono text-gray-800 break-all">{profile!.id}</p>
                <button onClick={copyPersonId} className="mt-2 text-xs text-blue-600 font-medium">
                  {copied ? t("Copié ✓", "Copied ✓") : t("Copier l'ID", "Copy ID")}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">{t("— ou —", "— or —")}</p>
              <form onSubmit={handleInvite} className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">{t("ID du patient (person_id)", "Patient ID (person_id)")}</label>
                <input
                  className="input-field"
                  value={invitePersonId}
                  onChange={e => setInvitePersonId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                {inviteMsg && <p className={`text-xs ${inviteMsg.startsWith(t("Invitation", "Invitation")) ? "text-green-700" : "text-red-600"}`}>{inviteMsg}</p>}
                <button type="submit" disabled={inviteSending || !invitePersonId.trim()} className="w-full py-2.5 bg-indigo-700 text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50 text-sm">
                  {inviteSending ? t("Envoi…", "Sending…") : t("Envoyer l'invitation", "Send invitation")}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Pending invitations */}
        {pendingLinks.length > 0 && (
          <div>
            <h2 className="section-title">{t("Invitations en attente", "Pending invitations")} ({pendingLinks.length})</h2>
            <div className="space-y-2">
              {pendingLinks.map(p => (
                <div key={p.linkId} className="card border-amber-200 bg-amber-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{t("En attente de réponse", "Awaiting response")}</p>
                  </div>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">{t("En attente", "Pending")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patients list */}
        <div>
          <h2 className="section-title">{t("Mes patients", "My patients")} ({patients.length})</h2>
          {patients.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">{t("Aucun patient pour l'instant.", "No patients yet.")}</p>
              <p className="text-gray-400 text-xs mt-1">{t("Invitez vos patients ci-dessus.", "Invite your patients above.")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patients.map(p => (
                <div key={p.linkId} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">ID: {p.personId}</p>
                  </div>
                  <Link
                    href={`/prescriptions?person_id=${p.personId}`}
                    className="text-xs text-blue-600 font-medium border border-blue-200 px-3 py-1.5 rounded-lg active:bg-blue-50"
                  >
                    {t("Ordonnances →", "Prescriptions →")}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
