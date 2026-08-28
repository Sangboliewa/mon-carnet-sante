"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Vaccination, VaccinationInsert } from "@/lib/supabase/types";
import { useI18n } from "@/lib/i18n/context";
import { useLang } from "@/lib/i18n/LanguageContext";
import { saveToCache, loadFromCache, isOnline } from "@/lib/offline/cache";

const BLANK: Omit<VaccinationInsert, "person_id"> = {
  vaccine_name: "", vaccine_code: "", coding_system: "INTERNE",
  administered_date: null, batch_number: "", administering_center: "",
  next_dose_date: null, notes: "",
};

function getReminderStatus(nextDoseDate: string | null, t: ReturnType<typeof useI18n>["t"]): { label: string; className: string } | null {
  if (!nextDoseDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const next = new Date(nextDoseDate);
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0)  return { label: t.vaccins.overdue,                          className: "bg-red-100 text-red-800" };
  if (diffDays <= 7) return { label: `${t.vaccins.reminderIn} ${diffDays}j`,     className: "bg-orange-100 text-orange-800" };
  if (diffDays <= 30)return { label: `${t.vaccins.reminderIn} ${diffDays}j`,     className: "bg-yellow-100 text-yellow-800" };
  return { label: t.vaccins.reminderPlanned,                                      className: "bg-green-100 text-green-800" };
}

interface Props { personId: string; initialData: Vaccination[] }

export default function VaccinsClient({ personId, initialData }: Props) {
  const { t } = useI18n();
  const { lang } = useLang();
  const tl = (fr: string, en: string) => lang === "en" ? en : fr;

  const [items, setItems] = useState<Vaccination[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (isOnline()) {
      saveToCache(`vaccinations_${personId}`, initialData);
    } else {
      const cached = loadFromCache<Vaccination[]>(`vaccinations_${personId}`);
      if (cached) { setItems(cached); setFromCache(true); }
    }
  }, [personId, initialData]);

  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = items.filter(i => i.next_dose_date &&
    new Date(i.next_dose_date) <= new Date(today.getTime() + 30 * 86400000));

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value || null }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("vaccinations").insert({ ...form, person_id: personId }).select().single();
    setSaving(false);
    if (!error && data) {
      const updated = [data, ...items];
      setItems(updated);
      saveToCache(`vaccinations_${personId}`, updated);
      setForm(BLANK); setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("vaccinations").delete().eq("id", id);
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveToCache(`vaccinations_${personId}`, updated);
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {fromCache && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          📵 {t.offline.cachedData}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-orange-800">{t.vaccins.upcomingReminders}</p>
          {upcoming.map(v => {
            const status = getReminderStatus(v.next_dose_date, t);
            return (
              <div key={v.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-800">{v.vaccine_name}</span>
                {status && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => setShowForm(v => !v)} className="btn-primary">
        {showForm ? t.common.cancel : t.vaccins.addVaccine}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div>
            <label className="label">{t.vaccins.vaccineName} *</label>
            <input name="vaccine_name" required className="input-field" value={form.vaccine_name} onChange={handleChange} placeholder={tl("ex : Hépatite B", "e.g. Hepatitis B")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">{t.vaccins.vaccineCode}</label><input name="vaccine_code" className="input-field" value={form.vaccine_code ?? ""} onChange={handleChange} /></div>
            <div><label className="label">{t.vaccins.system}</label><input name="coding_system" className="input-field" value={form.coding_system} onChange={handleChange} /></div>
          </div>
          <div><label className="label">{t.vaccins.adminDate}</label><input name="administered_date" type="date" className="input-field" value={form.administered_date ?? ""} onChange={handleChange} /></div>
          <div><label className="label">{t.vaccins.batchNumber}</label><input name="batch_number" className="input-field" value={form.batch_number ?? ""} onChange={handleChange} /></div>
          <div><label className="label">{t.vaccins.adminCenter}</label><input name="administering_center" className="input-field" value={form.administering_center ?? ""} onChange={handleChange} /></div>
          <div><label className="label">{t.vaccins.nextDose}</label><input name="next_dose_date" type="date" className="input-field" value={form.next_dose_date ?? ""} onChange={handleChange} /></div>
          <div><label className="label">{t.common.notes}</label><textarea name="notes" className="input-field resize-none" rows={2} value={form.notes ?? ""} onChange={handleChange} /></div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? t.common.saving : t.common.save}</button>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">💉</div>
          <p className="font-semibold text-gray-800">{tl("Carnet vaccinal vide", "Vaccination record empty")}</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            {tl(
              "Renseigne tes vaccinations pour recevoir des rappels avant chaque date de rappel. Essentiel pour toi et ta famille.",
              "Record your vaccinations to receive reminders before each booster date. Essential for you and your family."
            )}
          </p>
          <button onClick={() => setShowForm(true)} className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            {tl("+ Ajouter un vaccin", "+ Add a vaccine")}
          </button>
        </div>
      )}

      {items.map(item => {
        const status = getReminderStatus(item.next_dose_date, t);
        const isOverdue = status?.className.includes("red");
        const isUrgent = status?.className.includes("orange");
        const isPlanned = status?.className.includes("green") || status?.className.includes("yellow");
        const borderCls = isOverdue ? "border-l-red-400" : isUrgent ? "border-l-orange-400" : isPlanned ? "border-l-green-400" : "border-l-gray-200";
        const iconBg = isOverdue ? "bg-red-50" : isUrgent ? "bg-orange-50" : "bg-blue-50";
        return (
          <div key={item.id} className={`card flex items-start gap-3 border-l-4 ${borderCls}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${iconBg}`}>
              💉
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{item.vaccine_name}</p>
                {status && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {item.administered_date && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-gray-300">✓</span> {t.vaccins.administered} : <span className="font-medium">{item.administered_date}</span>
                  </p>
                )}
                {item.administering_center && (
                  <p className="text-xs text-gray-400">🏥 {item.administering_center}</p>
                )}
                {item.next_dose_date && (
                  <p className={`text-xs font-medium ${isOverdue ? "text-red-600" : isUrgent ? "text-orange-600" : "text-gray-500"}`}>
                    📅 {tl("Prochain rappel :", "Next booster:")} {item.next_dose_date}
                  </p>
                )}
                {item.batch_number && <p className="text-xs text-gray-400">{tl("Lot :", "Batch:")} {item.batch_number}</p>}
                {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
              </div>
              <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-red-400 text-xs mt-2">
                {deletingId === item.id ? t.common.deleting : t.common.delete}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
