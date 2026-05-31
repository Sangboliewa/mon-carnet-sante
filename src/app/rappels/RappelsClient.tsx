"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedicationReminder, MedicationReminderInsert } from "@/lib/supabase/types";
import { useI18n } from "@/lib/i18n/context";
import { saveToCache, loadFromCache, isOnline } from "@/lib/offline/cache";

function todayStr() { return new Date().toISOString().split("T")[0]; }

function nextOccurrence(timeStr: string, todayWord: string, tomorrowWord: string): { label: string; urgent: boolean } {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diffMin < 60) return { label: `${diffMin} min`, urgent: true };
  if (diffMin < 120) return { label: `${Math.round(diffMin / 60)}h`, urgent: true };
  return { label: target.getHours() === h ? todayWord : tomorrowWord, urgent: false };
}

interface Props { personId: string; initialData: MedicationReminder[] }

export default function RappelsClient({ personId, initialData }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<MedicationReminder[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (isOnline()) {
      saveToCache(`reminders_${personId}`, initialData);
    } else {
      const cached = loadFromCache<MedicationReminder[]>(`reminders_${personId}`);
      if (cached) { setItems(cached); setFromCache(true); }
    }
  }, [personId, initialData]);

  const active = items.filter(i => i.active);
  const inactive = items.filter(i => !i.active);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!medName.trim() || !times.length) return;
    setSaving(true);
    const supabase = createClient();
    const payload: MedicationReminderInsert = {
      person_id: personId, medication_name: medName.trim(),
      dosage: dosage || null, reminder_times: times, active: true,
      start_date: startDate || null, end_date: endDate || null, notes: notes || null,
    };
    const { data } = await supabase.from("medication_reminders").insert(payload).select().single();
    setSaving(false);
    if (data) {
      const updated = [data, ...items];
      setItems(updated);
      saveToCache(`reminders_${personId}`, updated);
      setMedName(""); setDosage(""); setTimes(["08:00"]); setStartDate(todayStr()); setEndDate(""); setNotes("");
      setShowForm(false);
    }
  }

  async function handleToggle(item: MedicationReminder) {
    setTogglingId(item.id);
    const supabase = createClient();
    const { data } = await supabase.from("medication_reminders").update({ active: !item.active }).eq("id", item.id).select().single();
    if (data) {
      const updated = items.map(i => i.id === data.id ? data : i);
      setItems(updated);
      saveToCache(`reminders_${personId}`, updated);
    }
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("medication_reminders").delete().eq("id", id);
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveToCache(`reminders_${personId}`, updated);
    setDeletingId(null);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {fromCache && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          📵 {t.offline.cachedData}
        </div>
      )}

      {active.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800">{t.rappels.todaySchedule}</p>
          {active.flatMap(item =>
            item.reminder_times.map(tm => {
              const { label, urgent } = nextOccurrence(tm, t.common.today, t.common.tomorrow);
              return (
                <div key={`${item.id}-${tm}`} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.medication_name}</p>
                    <p className="text-xs text-gray-500">{item.dosage ?? ""} · {tm}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgent ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{label}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      <button onClick={() => setShowForm(v => !v)} className="btn-primary">
        {showForm ? t.common.cancel : t.rappels.addReminder}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div><label className="label">{t.rappels.medicationName} *</label><input required className="input-field" value={medName} onChange={e => setMedName(e.target.value)} placeholder="ex : Metformine 500 mg" /></div>
          <div><label className="label">{t.rappels.dosage}</label><input className="input-field" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="ex : 1 comprimé" /></div>
          <div>
            <label className="label">{t.rappels.times}</label>
            <div className="space-y-2">
              {times.map((tm, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="time" className="input-field flex-1" value={tm} onChange={e => setTimes(t2 => t2.map((v, idx) => idx === i ? e.target.value : v))} />
                  {times.length > 1 && <button type="button" onClick={() => setTimes(t2 => t2.filter((_, idx) => idx !== i))} className="text-red-400 text-lg px-2">×</button>}
                </div>
              ))}
              {times.length < 6 && <button type="button" onClick={() => setTimes(t2 => [...t2, "12:00"])} className="text-health-blue text-sm font-medium">{t.rappels.addTime}</button>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">{t.rappels.startDate}</label><input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><label className="label">{t.rappels.endDate}</label><input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </div>
          <div><label className="label">{t.common.notes}</label><textarea className="input-field resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? t.common.saving : t.common.save}</button>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center text-gray-500 py-8 text-sm">{t.rappels.noReminders}</div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t.rappels.activeReminders} ({active.length})</p>
          {active.map(item => (
            <div key={item.id} className="card space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{item.medication_name}</p>
                  {item.dosage && <p className="text-sm text-gray-600">{item.dosage}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.reminder_times.map(tm => <span key={tm} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{tm}</span>)}
                  </div>
                  {item.end_date && <p className="text-xs text-gray-400 mt-0.5">{t.rappels.until} {item.end_date}</p>}
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              </div>
              {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
              <div className="flex gap-4 pt-1">
                <button onClick={() => handleToggle(item)} disabled={togglingId === item.id} className="text-xs text-gray-500">{togglingId === item.id ? "…" : t.rappels.deactivate}</button>
                <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-xs text-red-400">{deletingId === item.id ? "…" : t.common.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t.rappels.inactiveReminders} ({inactive.length})</p>
          {inactive.map(item => (
            <div key={item.id} className="card opacity-50 space-y-1">
              <div className="flex justify-between items-start">
                <p className="font-semibold text-gray-700">{item.medication_name}</p>
                <span className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleToggle(item)} disabled={togglingId === item.id} className="text-xs text-health-blue">{togglingId === item.id ? "…" : t.rappels.reactivate}</button>
                <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-xs text-red-400">{deletingId === item.id ? "…" : t.common.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
