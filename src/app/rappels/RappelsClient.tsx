"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedicationReminder, MedicationReminderInsert } from "@/lib/supabase/types";
import { useI18n } from "@/lib/i18n/context";
import { saveToCache, loadFromCache, isOnline } from "@/lib/offline/cache";

function todayStr() { return new Date().toISOString().split("T")[0]; }

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function countdownLabel(tm: string): { label: string; status: "past" | "urgent" | "soon" | "later" } {
  const target = timeToMinutes(tm);
  const now = nowMinutes();
  const diff = target - now;
  if (diff < -15) return { label: "Passé", status: "past" };
  if (diff < 0) return { label: "Maintenant", status: "urgent" };
  if (diff < 60) return { label: `Dans ${diff} min`, status: "urgent" };
  if (diff < 120) return { label: `Dans ${Math.round(diff / 60)}h`, status: "soon" };
  return { label: tm, status: "later" };
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
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [nowMin, setNowMin] = useState(nowMinutes());

  // Load "taken" state from localStorage (reset at midnight)
  useEffect(() => {
    const key = `med_taken_${personId}_${todayStr()}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
      setTaken(new Set(saved));
    } catch { /* ignore */ }
  }, [personId]);

  // Tick every 60s to update countdowns
  useEffect(() => {
    const id = setInterval(() => setNowMin(nowMinutes()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isOnline()) {
      saveToCache(`reminders_${personId}`, initialData);
    } else {
      const cached = loadFromCache<MedicationReminder[]>(`reminders_${personId}`);
      if (cached) { setItems(cached); setFromCache(true); }
    }
  }, [personId, initialData]);

  function markTaken(doseKey: string) {
    const next = new Set(taken);
    if (next.has(doseKey)) { next.delete(doseKey); } else { next.add(doseKey); }
    setTaken(next);
    const key = `med_taken_${personId}_${todayStr()}`;
    localStorage.setItem(key, JSON.stringify([...next]));
  }

  const active = items.filter(i => i.active);
  const inactive = items.filter(i => !i.active);

  // Build today's timeline sorted by time
  const todayDoses = active
    .flatMap(item => item.reminder_times.map(tm => ({ item, tm, key: `${item.id}-${tm}` })))
    .sort((a, b) => timeToMinutes(a.tm) - timeToMinutes(b.tm));

  const takenCount = todayDoses.filter(d => taken.has(d.key)).length;
  const totalToday = todayDoses.length;

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

  void nowMin; // used only to trigger re-render

  return (
    <div className="px-4 py-5 space-y-5">
      {fromCache && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          📵 {t.offline.cachedData}
        </div>
      )}

      {/* ── Programme du jour ── */}
      {todayDoses.length > 0 && (
        <div className="space-y-3">
          {/* Progress header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Programme du jour</p>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${takenCount === totalToday ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
              {takenCount}/{totalToday} pris
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: totalToday > 0 ? (takenCount / totalToday * 100) + "%" : "0%" }} />
          </div>
          {takenCount === totalToday && totalToday > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700 font-medium text-center">
              🎉 Tous les médicaments du jour sont pris !
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            {todayDoses.map(({ item, tm, key }) => {
              const { label, status } = countdownLabel(tm);
              const isTaken = taken.has(key);
              return (
                <div key={key} className={"rounded-2xl border-2 p-4 flex items-center gap-3 transition-all " + (
                  isTaken ? "bg-green-50 border-green-200 opacity-70" :
                  status === "urgent" ? "bg-orange-50 border-orange-300" :
                  status === "past" ? "bg-gray-50 border-gray-200 opacity-60" :
                  "bg-white border-gray-200"
                )}>
                  {/* Time */}
                  <div className="w-14 text-center shrink-0">
                    <p className={"text-base font-bold " + (isTaken ? "text-green-600" : status === "urgent" ? "text-orange-600" : "text-gray-800")}>{tm}</p>
                    <p className={"text-[10px] font-medium " + (isTaken ? "text-green-500" : status === "urgent" ? "text-orange-500" : "text-gray-400")}>{isTaken ? "✓ pris" : label}</p>
                  </div>
                  {/* Separator */}
                  <div className={"w-px h-10 " + (isTaken ? "bg-green-200" : status === "urgent" ? "bg-orange-300" : "bg-gray-200")} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={"font-semibold text-sm " + (isTaken ? "line-through text-gray-400" : "text-gray-900")}>{item.medication_name}</p>
                    {item.dosage && <p className="text-xs text-gray-500 mt-0.5">{item.dosage}</p>}
                  </div>
                  {/* Action */}
                  <button
                    onClick={() => markTaken(key)}
                    className={"shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all " + (
                      isTaken ? "bg-green-500 border-green-500 text-white scale-95" :
                      status === "urgent" ? "border-orange-400 text-orange-400 active:bg-orange-50" :
                      "border-gray-300 text-gray-300 active:bg-gray-50"
                    )}
                    title={isTaken ? "Marquer comme non pris" : "Marquer comme pris"}
                  >
                    {isTaken ? "✓" : "○"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ajouter ── */}
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

      {/* ── Empty state ── */}
      {items.length === 0 && !showForm && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">⏰</div>
          <p className="font-semibold text-gray-800">Ne rate plus jamais un médicament</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Configure des rappels quotidiens pour chaque traitement. Tu recevras une notification à l&apos;heure exacte.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            + Configurer mes rappels
          </button>
        </div>
      )}

      {/* ── Actifs ── */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t.rappels.activeReminders} ({active.length})</p>
          {active.map(item => (
            <div key={item.id} className="card flex items-start gap-3 border-l-4 border-l-indigo-400">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">
                💊
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{item.medication_name}</p>
                    {item.dosage && <p className="text-sm text-gray-600">{item.dosage}</p>}
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.reminder_times.map(tm => <span key={tm} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">⏰ {tm}</span>)}
                </div>
                {item.end_date && <p className="text-xs text-gray-400 mt-0.5">{t.rappels.until} {item.end_date}</p>}
                {item.notes && <p className="text-xs text-gray-500 italic mt-0.5">{item.notes}</p>}
                <div className="flex gap-4 pt-1.5">
                  <button onClick={() => handleToggle(item)} disabled={togglingId === item.id} className="text-xs text-gray-500">{togglingId === item.id ? "…" : t.rappels.deactivate}</button>
                  <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-xs text-red-400">{deletingId === item.id ? "…" : t.common.delete}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Inactifs ── */}
      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t.rappels.inactiveReminders} ({inactive.length})</p>
          {inactive.map(item => (
            <div key={item.id} className="card flex items-start gap-3 border-l-4 border-l-gray-200 opacity-60">
              <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                💊
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-700">{item.medication_name}</p>
                {item.dosage && <p className="text-xs text-gray-500">{item.dosage}</p>}
                <div className="flex gap-4 mt-1.5">
                  <button onClick={() => handleToggle(item)} disabled={togglingId === item.id} className="text-xs text-health-blue">{togglingId === item.id ? "…" : t.rappels.reactivate}</button>
                  <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-xs text-red-400">{deletingId === item.id ? "…" : t.common.delete}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
