"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SymptomLog, SymptomLogInsert } from "@/lib/supabase/types";

const MOODS = ["😞", "😕", "😐", "🙂", "😊"];
const MOOD_LABELS = ["Très mauvaise", "Mauvaise", "Neutre", "Bonne", "Très bonne"];
const MOOD_COLORS = ["bg-red-100 border-red-300", "bg-orange-100 border-orange-300", "bg-yellow-100 border-yellow-300", "bg-green-100 border-green-300", "bg-emerald-100 border-emerald-300"];
const MOOD_TEXT   = ["text-red-700", "text-orange-700", "text-yellow-700", "text-green-700", "text-emerald-700"];

const COMMON_SYMPTOMS = [
  "Fièvre", "Maux de tête", "Fatigue", "Nausées", "Toux",
  "Douleurs abdominales", "Vertiges", "Courbatures", "Essoufflement", "Frissons",
];

function PainDots({ value, max = 10, onChange }: { value: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v === value ? 0 : v)}
          className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-all ${
            v <= value
              ? v <= 3 ? "bg-green-500 border-green-500 text-white" :
                v <= 6 ? "bg-orange-500 border-orange-500 text-white" :
                "bg-red-500 border-red-500 text-white"
              : "bg-white border-gray-200 text-gray-400"
          }`}
        >
          {v}
        </button>
      ))}
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

function today() { return new Date().toISOString().split("T")[0]; }
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
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"view" | "checkin">("view");

  const existingToday = useMemo(() => items.find((i) => i.logged_date === today()), [items]);

  function openCheckin(item?: SymptomLog) {
    if (item) {
      setDate(item.logged_date);
      setPain(item.pain_level ?? 0);
      setFatigue(item.fatigue_level ?? 0);
      setMood(item.mood ?? 3);
      setSymptomsText(item.symptoms_text ?? "");
      setSelectedSymptoms(item.symptoms_text ? item.symptoms_text.split(", ") : []);
      setNotes(item.notes ?? "");
    } else {
      setDate(today());
      setPain(0); setFatigue(0); setMood(3);
      setSymptomsText(""); setSelectedSymptoms([]); setNotes("");
    }
    setMode("checkin");
  }

  function toggleSymptom(s: string) {
    setSelectedSymptoms(prev => {
      const next = prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s];
      setSymptomsText(next.join(", "));
      return next;
    });
  }

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
      setItems(prev => {
        const filtered = prev.filter(i => i.logged_date !== data!.logged_date);
        return [data!, ...filtered].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
      });
      setMode("view");
    }
  }

  const recent = items.slice(0, 14);

  if (mode === "checkin") {
    return (
      <div className="px-4 py-5 animate-slide-up">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Date */}
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900 text-lg">Comment tu te sens ?</p>
            <input type="date" className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Humeur — sélecteur visuel grand */}
          <div className="card space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Humeur générale</p>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((emoji, i) => {
                const v = i + 1;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMood(v)}
                    className={`flex flex-col items-center gap-1 rounded-2xl py-3 border-2 transition-all ${
                      mood === v ? `${MOOD_COLORS[i]} scale-105 shadow-sm` : "border-gray-100 bg-white"
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className={`text-[9px] font-medium leading-tight text-center ${mood === v ? MOOD_TEXT[i] : "text-gray-400"}`}>
                      {MOOD_LABELS[i]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Douleur */}
          <div className="card space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Douleur</p>
              <span className="font-bold text-health-blue">{pain === 0 ? "Aucune" : `${pain}/10`}</span>
            </div>
            <PainDots value={pain} onChange={setPain} />
            <p className="text-xs text-gray-400">
              {pain === 0 ? "Pas de douleur — excellent !" : pain <= 3 ? "Légère — gérable" : pain <= 6 ? "Modérée — à surveiller" : "Élevée — consulte un médecin"}
            </p>
          </div>

          {/* Fatigue */}
          <div className="card space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Fatigue</p>
              <span className="font-bold text-indigo-600">{fatigue === 0 ? "Reposé(e)" : `${fatigue}/10`}</span>
            </div>
            <PainDots value={fatigue} onChange={setFatigue} />
          </div>

          {/* Symptômes — chips cliquables */}
          <div className="card space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Symptômes ressentis</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSymptom(s)}
                  className={`text-xs rounded-full px-3 py-1.5 border font-medium transition-all ${
                    selectedSymptoms.includes(s)
                      ? "bg-health-blue text-white border-health-blue"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              className="input-field text-sm"
              value={symptomsText}
              onChange={e => setSymptomsText(e.target.value)}
              placeholder="Autre symptôme…"
            />
          </div>

          {/* Notes */}
          <div className="card space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Notes libres</p>
            <textarea
              className="input-field resize-none text-sm"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contexte, médicaments pris, observations…"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Enregistrement…" : "✅ Enregistrer"}
            </button>
            <button type="button" onClick={() => setMode("view")} className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-medium text-gray-600 active:bg-gray-50">
              Annuler
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4 animate-slide-up">
      {/* Check-in card du jour */}
      {existingToday ? (
        <div className={`card border-2 ${MOOD_COLORS[(existingToday.mood ?? 3) - 1]} space-y-2`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Journal d&apos;aujourd&apos;hui</p>
              <p className={`text-2xl font-bold mt-0.5 ${MOOD_TEXT[(existingToday.mood ?? 3) - 1]}`}>
                {MOODS[(existingToday.mood ?? 3) - 1]} {MOOD_LABELS[(existingToday.mood ?? 3) - 1]}
              </p>
            </div>
            <button
              onClick={() => openCheckin(existingToday)}
              className="text-xs bg-white text-gray-600 border border-gray-200 rounded-xl px-3 py-1.5 font-medium"
            >
              Modifier
            </button>
          </div>
          {(existingToday.pain_level ?? 0) > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Douleur</p>
              <MiniBar value={existingToday.pain_level!} max={10} color={existingToday.pain_level! >= 7 ? "bg-red-400" : existingToday.pain_level! >= 4 ? "bg-orange-400" : "bg-green-400"} />
            </div>
          )}
          {(existingToday.fatigue_level ?? 0) > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Fatigue</p>
              <MiniBar value={existingToday.fatigue_level!} max={10} color={existingToday.fatigue_level! >= 7 ? "bg-purple-400" : existingToday.fatigue_level! >= 4 ? "bg-yellow-400" : "bg-green-400"} />
            </div>
          )}
          {existingToday.symptoms_text && (
            <p className="text-xs text-gray-600 italic">{existingToday.symptoms_text}</p>
          )}
        </div>
      ) : (
        /* Pas encore de check-in aujourd'hui */
        <div className="card border-2 border-dashed border-health-blue/30 bg-blue-50/50">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Comment tu te sens aujourd&apos;hui ?</p>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {MOODS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => { setMood(i + 1); setMode("checkin"); }}
                className="flex flex-col items-center gap-1 rounded-2xl py-3 bg-white border border-gray-100 active:scale-95 transition-transform"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[9px] text-gray-400 leading-tight text-center">{MOOD_LABELS[i]}</span>
              </button>
            ))}
          </div>
          <button onClick={() => openCheckin()} className="w-full text-center text-sm text-health-blue font-medium py-1">
            Saisir le journal complet →
          </button>
        </div>
      )}

      {/* Historique 14 jours */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">14 derniers jours</p>
          {recent.map((item) => (
            <button
              key={item.id}
              className="card w-full text-left space-y-2 active:bg-gray-50"
              onClick={() => openCheckin(item)}
            >
              <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-900 text-sm">{formatDate(item.logged_date)}</p>
                {item.mood && <span className="text-xl">{MOODS[(item.mood ?? 3) - 1]}</span>}
              </div>
              {(item.pain_level ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Douleur</p>
                  <MiniBar value={item.pain_level!} max={10} color={item.pain_level! >= 7 ? "bg-red-400" : item.pain_level! >= 4 ? "bg-orange-400" : "bg-green-400"} />
                </div>
              )}
              {(item.fatigue_level ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Fatigue</p>
                  <MiniBar value={item.fatigue_level!} max={10} color={item.fatigue_level! >= 7 ? "bg-purple-400" : item.fatigue_level! >= 4 ? "bg-yellow-400" : "bg-green-400"} />
                </div>
              )}
              {item.symptoms_text && (
                <p className="text-xs text-gray-500 italic truncate">{item.symptoms_text}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="card text-center py-8 space-y-2">
          <p className="text-3xl">📝</p>
          <p className="font-semibold text-gray-800">Commence ton journal de santé</p>
          <p className="text-sm text-gray-500">
            Enregistre humeur, douleur et symptômes chaque jour. En 7 jours tu verras des tendances utiles.
          </p>
        </div>
      )}
    </div>
  );
}
