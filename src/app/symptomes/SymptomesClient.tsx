"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SymptomLog, SymptomLogInsert } from "@/lib/supabase/types";

const MOOD_LABELS = ["", "😞 Très mauvaise", "😕 Mauvaise", "😐 Neutre", "🙂 Bonne", "😊 Très bonne"];
const MOOD_COLORS = ["", "text-red-600", "text-orange-500", "text-yellow-500", "text-green-500", "text-emerald-600"];

function ScaleInput({ label, value, max, onChange, lowLabel, highLabel }: {
  label: string; value: number; max: number;
  onChange: (v: number) => void; lowLabel?: string; highLabel?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="label mb-0">{label}</label>
        <span className="text-sm font-bold text-health-blue">{value}/{max}</span>
      </div>
      <input type="range" min={0} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-health-blue" />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>{lowLabel}</span><span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-4 text-right">{value}</span>
    </div>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

interface Props { personId: string; initialData: SymptomLog[] }

export default function SymptomesClient({ personId, initialData }: Props) {
  const [items, setItems] = useState<SymptomLog[]>(initialData);
  const [date, setDate] = useState(today());
  const [pain, setPain] = useState(0);
  const [fatigue, setFatigue] = useState(0);
  const [mood, setMood] = useState(3);
  const [symptomsText, setSymptomsText] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const existingToday = useMemo(() => items.find((i) => i.logged_date === today()), [items]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload: SymptomLogInsert = {
      person_id: personId,
      logged_date: date,
      pain_level: pain,
      fatigue_level: fatigue,
      mood,
      symptoms_text: symptomsText || null,
      notes: notes || null,
    };

    const existing = items.find((i) => i.logged_date === date);
    let data: SymptomLog | null = null;

    if (existing) {
      const res = await supabase.from("symptom_logs").update(payload).eq("id", existing.id).select().single();
      data = res.data;
    } else {
      const res = await supabase.from("symptom_logs").insert(payload).select().single();
      data = res.data;
    }

    setSaving(false);
    if (data) {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.logged_date !== data!.logged_date);
        return [data!, ...filtered].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
      });
      setShowForm(false);
    }
  }

  function openForDate(item?: SymptomLog) {
    if (item) {
      setDate(item.logged_date);
      setPain(item.pain_level ?? 0);
      setFatigue(item.fatigue_level ?? 0);
      setMood(item.mood ?? 3);
      setSymptomsText(item.symptoms_text ?? "");
      setNotes(item.notes ?? "");
    } else {
      setDate(today());
      setPain(0); setFatigue(0); setMood(3);
      setSymptomsText(""); setNotes("");
    }
    setShowForm(true);
  }

  const recent = items.slice(0, 14);

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Bouton aujourd'hui */}
      <button
        onClick={() => openForDate(existingToday)}
        className="btn-primary"
      >
        {existingToday ? "Modifier le journal d'aujourd'hui" : "Saisir le journal d'aujourd'hui"}
      </button>

      {showForm && (
        <form onSubmit={handleSave} className="card space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-gray-700">Journal du</p>
            <input type="date" className="input-field w-auto text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <ScaleInput label="Douleur" value={pain} max={10} onChange={setPain} lowLabel="Aucune" highLabel="Insupportable" />
          <ScaleInput label="Fatigue" value={fatigue} max={10} onChange={setFatigue} lowLabel="Reposé(e)" highLabel="Épuisé(e)" />

          <div>
            <label className="label">Humeur</label>
            <div className="flex gap-2 justify-between">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMood(v)}
                  className={`flex-1 text-2xl rounded-xl py-2 border-2 transition-all ${mood === v ? "border-health-blue bg-health-blue-light scale-110" : "border-gray-100 bg-white"}`}
                >
                  {["😞", "😕", "😐", "🙂", "😊"][v - 1]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Symptômes ressentis</label>
            <input className="input-field" value={symptomsText} onChange={(e) => setSymptomsText(e.target.value)}
              placeholder="ex : maux de tête, nausées, vertiges…" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field resize-none" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-300 py-2 text-sm text-gray-600">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Historique */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">14 derniers jours</p>
          {recent.map((item) => (
            <button key={item.id} className="card w-full text-left space-y-2 active:bg-gray-50"
              onClick={() => openForDate(item)}>
              <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-900 text-sm">{formatDate(item.logged_date)}</p>
                {item.mood && (
                  <span className={`text-lg ${MOOD_COLORS[item.mood]}`}>
                    {["😞", "😕", "😐", "🙂", "😊"][(item.mood ?? 3) - 1]}
                  </span>
                )}
              </div>
              {item.pain_level != null && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Douleur</p>
                  <MiniBar value={item.pain_level} max={10} color={item.pain_level >= 7 ? "bg-red-400" : item.pain_level >= 4 ? "bg-orange-400" : "bg-green-400"} />
                </div>
              )}
              {item.fatigue_level != null && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Fatigue</p>
                  <MiniBar value={item.fatigue_level} max={10} color={item.fatigue_level >= 7 ? "bg-purple-400" : item.fatigue_level >= 4 ? "bg-yellow-400" : "bg-green-400"} />
                </div>
              )}
              {item.symptoms_text && (
                <p className="text-xs text-gray-500 italic truncate">{item.symptoms_text}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center text-gray-500 py-8 text-sm">
          Commencez votre journal de symptômes dès aujourd&apos;hui.
        </div>
      )}
    </div>
  );
}
