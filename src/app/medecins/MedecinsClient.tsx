"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

interface Contact {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  contact_type: string;
  created_at: string;
}

const ICON_MAP: Record<string, string> = { doctor:"🩺", specialist:"👨‍⚕️", pharmacy:"💊", lab:"🔬", hospital:"🏥", other:"📋" };

const EMPTY: Omit<Contact, "id" | "created_at"> = {
  name: "", specialty: "", phone: "", address: "", notes: "", contact_type: "doctor",
};

export default function MedecinsClient({ personId, initialContacts }: { personId: string; initialContacts: Contact[] }) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const TYPES = [
    { value: "doctor",     label: t("Médecin", "Doctor"),       icon: "🩺" },
    { value: "specialist", label: t("Spécialiste", "Specialist"), icon: "👨‍⚕️" },
    { value: "pharmacy",   label: t("Pharmacie", "Pharmacy"),    icon: "💊" },
    { value: "lab",        label: t("Laboratoire", "Laboratory"), icon: "🔬" },
    { value: "hospital",   label: t("Hôpital", "Hospital"),      icon: "🏥" },
    { value: "other",      label: t("Autre", "Other"),           icon: "📋" },
  ];

  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Contact, "id"|"created_at">>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.specialty ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setForm(EMPTY); setEditing(null); setShowForm(true); }
  function openEdit(c: Contact) { setForm({ name:c.name, specialty:c.specialty, phone:c.phone, address:c.address, notes:c.notes, contact_type:c.contact_type }); setEditing(c.id); setShowForm(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    if (editing) {
      const { data } = await supabase.from("medical_contacts").update({ ...form }).eq("id", editing).select().single();
      if (data) setContacts(c => c.map(x => x.id === editing ? data as Contact : x));
    } else {
      const { data } = await supabase.from("medical_contacts").insert({ ...form, person_id: personId }).select().single();
      if (data) setContacts(c => [data as Contact, ...c]);
    }
    setSaving(false);
    setShowForm(false);
  }

  async function del(id: string) {
    if (!confirm(t("Supprimer ce contact ?", "Delete this contact?"))) return;
    const supabase = createClient();
    await supabase.from("medical_contacts").delete().eq("id", id);
    setContacts(c => c.filter(x => x.id !== id));
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("Rechercher un contact…", "Search a contact…")}
          className="input-field flex-1 text-sm"
        />
        <button onClick={openAdd} className="flex-shrink-0 bg-health-blue text-white font-semibold rounded-xl px-4 py-2 text-sm">
          + {t("Ajouter", "Add")}
        </button>
      </div>

      {showForm && (
        <div className="card space-y-3">
          <h3 className="font-bold text-gray-900">{editing ? t("Modifier", "Edit") : t("Nouveau contact", "New contact")}</h3>

          <div className="flex gap-2 flex-wrap">
            {TYPES.map(tp => (
              <button key={tp.value} type="button"
                onClick={() => setForm(f => ({ ...f, contact_type: tp.value }))}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.contact_type === tp.value ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}
              >
                {tp.icon} {tp.label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">{t("Nom", "Name")} *</label>
            <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder={t("Dr. Koné, Pharmacie du Centre…", "Dr. Smith, City Pharmacy…")} className="input-field" />
          </div>
          <div>
            <label className="label">{t("Spécialité", "Specialty")}</label>
            <input value={form.specialty ?? ""} onChange={e => setForm(f=>({...f,specialty:e.target.value}))} placeholder={t("Cardiologie, Pédiatrie…", "Cardiology, Pediatrics…")} className="input-field" />
          </div>
          <div>
            <label className="label">{t("Téléphone", "Phone")}</label>
            <input type="tel" value={form.phone ?? ""} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="+225 07 00 00 00" className="input-field" />
          </div>
          <div>
            <label className="label">{t("Adresse", "Address")}</label>
            <input value={form.address ?? ""} onChange={e => setForm(f=>({...f,address:e.target.value}))} placeholder={t("Quartier, ville…", "District, city…")} className="input-field" />
          </div>
          <div>
            <label className="label">{t("Notes", "Notes")}</label>
            <textarea value={form.notes ?? ""} onChange={e => setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder={t("Disponibilités, tarifs, commentaires…", "Availability, fees, comments…")} className="input-field resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium">
              {t("Annuler", "Cancel")}
            </button>
            <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-health-blue text-white text-sm font-semibold disabled:opacity-50">
              {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">👨‍⚕️</div>
          <p className="font-semibold text-gray-700">{t("Aucun contact médical", "No medical contact")}</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">{t("Médecin traitant, spécialiste, pharmacie…", "Primary doctor, specialist, pharmacy…")}</p>
          <button onClick={openAdd} className="btn-primary max-w-xs mx-auto">
            + {t("Ajouter mon médecin traitant", "Add my primary doctor")}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="card p-0 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-xl flex-shrink-0">
                {ICON_MAP[c.contact_type] ?? "📋"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    {c.specialty && <p className="text-sm text-teal-700 font-medium">{c.specialty}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="text-xs text-gray-400 px-2 py-1 rounded-lg border border-gray-100">
                      ✏️
                    </button>
                    <button onClick={() => del(c.id)} className="text-xs text-red-400 px-2 py-1 rounded-lg border border-red-100">
                      🗑
                    </button>
                  </div>
                </div>
                {c.address && <p className="text-xs text-gray-500 mt-1">📍 {c.address}</p>}
                {c.notes && <p className="text-xs text-gray-400 mt-1 italic">{c.notes}</p>}
              </div>
            </div>
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className="flex items-center justify-center gap-2 py-3 border-t border-gray-100 bg-green-50 text-green-700 font-semibold text-sm active:bg-green-100"
              >
                📞 {t("Appeler", "Call")} — {c.phone}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
