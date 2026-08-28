"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

interface ActivityLog {
  id: string;
  log_date: string;
  activity_type: string;
  duration_min: number;
  calories_burned: number | null;
  steps: number | null;
  distance_km: number | null;
  intensity: string;
  notes: string | null;
}

interface Props {
  personId: string;
  heightCm: number | null;
  weightKg: number | null;
}

const ACTIVITIES: { value: string; label: string; icon: string; met: number }[] = [
  { value: "marche",    label: "Marche",     icon: "🚶", met: 3.5 },
  { value: "course",    label: "Course",     icon: "🏃", met: 8.0 },
  { value: "velo",      label: "Vélo",       icon: "🚴", met: 6.0 },
  { value: "natation",  label: "Natation",   icon: "🏊", met: 7.0 },
  { value: "gym",       label: "Muscu/Gym",  icon: "🏋️", met: 5.0 },
  { value: "yoga",      label: "Yoga",       icon: "🧘", met: 2.5 },
  { value: "football",  label: "Football",   icon: "⚽", met: 7.0 },
  { value: "danse",     label: "Danse",      icon: "💃", met: 4.5 },
  { value: "autre",     label: "Autre",      icon: "🏅", met: 4.0 },
];

const INTENSITIES = [
  { value: "leger",   label: "Léger",   color: "text-green-600 bg-green-50", border: "border-l-green-400" },
  { value: "modere",  label: "Modéré",  color: "text-amber-600 bg-amber-50", border: "border-l-amber-400" },
  { value: "intense", label: "Intense", color: "text-red-600 bg-red-50",     border: "border-l-red-500"   },
];

const INTENSITY_MET_FACTOR: Record<string, number> = { leger: 0.75, modere: 1.0, intense: 1.3 };

function estimateCalories(met: number, durationMin: number, weightKg: number, intensity: string): number {
  return Math.round(met * INTENSITY_MET_FACTOR[intensity] * weightKg * (durationMin / 60));
}

function activityInfo(type: string) {
  return ACTIVITIES.find((a) => a.value === type) ?? ACTIVITIES[ACTIVITIES.length - 1];
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// SVG bar chart — calories brûlées 7 derniers jours
function CaloriesChart({ logs }: { logs: ActivityLog[] }) {
  const days: { date: string; label: string; kcal: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const kcal = logs.filter((l) => l.log_date === dateStr).reduce((s, l) => s + (l.calories_burned ?? 0), 0);
    days.push({ date: dateStr, label: d.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3), kcal });
  }

  const maxKcal = Math.max(...days.map((d) => d.kcal), 200);
  const W = 300; const H = 100; const barW = 30; const gap = 12;
  const GOAL = 300;

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Calories brûlées — 7 jours</p>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
        {/* Objectif line */}
        <line x1="0" y1={H - (GOAL / maxKcal) * H} x2={W} y2={H - (GOAL / maxKcal) * H} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
        <text x={W - 2} y={H - (GOAL / maxKcal) * H - 3} textAnchor="end" fontSize="7" fill="#f59e0b">objectif</text>

        {days.map((d, i) => {
          const x = i * (barW + gap) + gap / 2;
          const barH = d.kcal > 0 ? Math.max((d.kcal / maxKcal) * H, 4) : 0;
          const isToday = d.date === todayStr();
          return (
            <g key={d.date}>
              <rect x={x} y={H - barH} width={barW} height={barH} rx="4"
                fill={isToday ? "#1E6FBF" : d.kcal >= GOAL ? "#2EA87E" : "#93c5fd"} />
              {d.kcal > 0 && (
                <text x={x + barW / 2} y={H - barH - 3} textAnchor="middle" fontSize="7" fill="#374151">
                  {d.kcal}
                </text>
              )}
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="8" fill={isToday ? "#1E6FBF" : "#6b7280"} fontWeight={isToday ? "bold" : "normal"}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// IMC Widget
function ImcWidget({ height, weight }: { height: number; weight: number }) {
  const imc = weight / ((height / 100) ** 2);
  const cat = imc < 18.5 ? { label: "Insuffisance pondérale", color: "text-blue-600" }
    : imc < 25 ? { label: "Poids normal", color: "text-green-600" }
    : imc < 30 ? { label: "Surpoids", color: "text-amber-600" }
    : { label: "Obésité", color: "text-red-600" };
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Indice de Masse Corporelle</p>
        <p className={`text-2xl font-bold mt-1 ${cat.color}`}>{imc.toFixed(1)}</p>
        <p className={`text-xs font-medium mt-0.5 ${cat.color}`}>{cat.label}</p>
      </div>
      <div className="text-right text-xs text-gray-400">
        <p>{height} cm</p>
        <p>{weight} kg</p>
      </div>
    </div>
  );
}

function WeeklyGoal({ logs }: { logs: ActivityLog[] }) {
  const GOAL_MIN = 150;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayStr = monday.toISOString().split("T")[0];
  const weekMin = logs.filter((l) => l.log_date >= mondayStr).reduce((s, l) => s + l.duration_min, 0);
  const pct = Math.min(100, Math.round((weekMin / GOAL_MIN) * 100));
  const r = 28; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#3b82f6";
  return (
    <div className="card flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 36 36)" />
          <text x="36" y="36" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold" fill="#111827">
            {pct}%
          </text>
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-800 text-sm">Objectif hebdomadaire</p>
        <p className="text-xs text-gray-500 mt-0.5"><span className="font-bold text-gray-800">{weekMin}</span> / {GOAL_MIN} min cette semaine</p>
        <p className="text-xs text-gray-400 mt-0.5">Recommandation OMS</p>
        {pct >= 100 && <p className="text-xs text-green-600 font-semibold mt-1">🎉 Objectif atteint !</p>}
        {pct < 100 && weekMin > 0 && (
          <p className="text-xs text-blue-600 mt-1">{GOAL_MIN - weekMin} min restantes</p>
        )}
      </div>
    </div>
  );
}

export default function ActiviteClient({ personId, heightCm, weightKg }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [form, setForm] = useState({
    log_date: todayStr(),
    activity_type: "marche",
    duration_min: "",
    steps: "",
    distance_km: "",
    intensity: "modere",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weight = weightKg ?? 70;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("person_id", personId)
        .gte("log_date", since.toISOString().split("T")[0])
        .order("log_date", { ascending: false });
      setLogs((data as ActivityLog[]) ?? []);
      setLoading(false);
    })();
  }, [personId]);

  const todayLogs = logs.filter((l) => l.log_date === selectedDate);
  const todayCalories = todayLogs.reduce((s, l) => s + (l.calories_burned ?? 0), 0);
  const todayMinutes = todayLogs.reduce((s, l) => s + l.duration_min, 0);

  const activity = activityInfo(form.activity_type);
  const estimatedCal = form.duration_min && !isNaN(Number(form.duration_min))
    ? estimateCalories(activity.met, Number(form.duration_min), weight, form.intensity)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.duration_min) return;
    setSaving(true); setError(null);
    const supabase = createClient();
    const payload = {
      person_id: personId,
      log_date: form.log_date,
      activity_type: form.activity_type,
      duration_min: Number(form.duration_min),
      calories_burned: estimatedCal,
      steps: form.steps ? Number(form.steps) : null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      intensity: form.intensity,
      notes: form.notes || null,
    };
    const { data, error: err } = await supabase.from("activity_logs").insert(payload).select().single();
    if (err || !data) { setError(err?.message ?? t("Erreur", "Error")); setSaving(false); return; }
    setLogs((prev) => [data as ActivityLog, ...prev]);
    setForm({ log_date: todayStr(), activity_type: "marche", duration_min: "", steps: "", distance_km: "", intensity: "modere", notes: "" });
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("Supprimer cette activité ?", "Delete this activity?"))) return;
    const supabase = createClient();
    await supabase.from("activity_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  if (loading) return <div className="px-4 py-10 text-center text-gray-400 text-sm">{t("Chargement…", "Loading…")}</div>;

  return (
    <div className="px-4 py-5 space-y-4">
      {/* IMC */}
      {heightCm && weightKg && <ImcWidget height={heightCm} weight={weightKg} />}

      {/* Objectif semaine */}
      <WeeklyGoal logs={logs} />

      {/* Graphique 7j */}
      <CaloriesChart logs={logs} />

      {/* Résumé du jour */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Activités", value: String(todayLogs.length), icon: "🏅" },
          { label: "Minutes", value: String(todayMinutes), icon: "⏱️" },
          { label: "kcal brûlées", value: String(todayCalories), icon: "🔥" },
        ].map((s) => (
          <div key={s.label} className="card text-center py-3 px-2">
            <p className="text-xl">{s.icon}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sélecteur de date */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 font-medium">Date :</label>
        <input
          type="date"
          max={todayStr()}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field text-sm flex-1"
        />
      </div>

      {/* Liste activités du jour */}
      {todayLogs.length === 0 && !showForm && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">🏅</div>
          <p className="font-semibold text-gray-800">{t("Aucune activité enregistrée ce jour", "No activities recorded today")}</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Même 15 minutes de marche comptent ! Commence dès maintenant.
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            + Ajouter une activité
          </button>
        </div>
      )}

      {todayLogs.map((log) => {
        const info = activityInfo(log.activity_type);
        const intensityInfo = INTENSITIES.find((i) => i.value === log.intensity) ?? INTENSITIES[1];
        return (
          <div key={log.id} className={`card flex items-start gap-3 border-l-4 ${intensityInfo.border}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${intensityInfo.color.split(" ")[1]}`}>
              {info.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{info.label}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${intensityInfo.color}`}>{intensityInfo.label}</span>
                </div>
                <button onClick={() => handleDelete(log.id)} className="text-xs text-red-400 flex-shrink-0">✕</button>
              </div>
              <div className="flex gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-500">⏱️ {log.duration_min} min</span>
                {log.calories_burned && <span className="text-xs text-orange-600 font-medium">🔥 {log.calories_burned} kcal</span>}
                {log.steps && <span className="text-xs text-gray-500">👟 {log.steps.toLocaleString()} pas</span>}
                {log.distance_km && <span className="text-xs text-gray-500">📍 {log.distance_km} km</span>}
              </div>
              {log.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{log.notes}</p>}
            </div>
          </div>
        );
      })}

      {/* Bouton ajouter */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Ajouter une activité</button>
      )}

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-health-blue border-2">
          <h3 className="font-bold text-gray-900">Nouvelle activité</h3>

          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          {/* Activité picker */}
          <div>
            <label className="label">Type d&apos;activité</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, activity_type: a.value }))}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-sm transition-all ${form.activity_type === a.value ? "border-health-blue bg-health-blue-light" : "border-gray-100"}`}
                >
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-xs text-gray-700">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" max={todayStr()} value={form.log_date}
              onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value }))}
              className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Durée (min) *</label>
              <input type="number" required min="1" max="600" placeholder="30"
                value={form.duration_min}
                onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="label">Distance (km)</label>
              <input type="number" min="0" step="0.1" placeholder="0"
                value={form.distance_km}
                onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))}
                className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Nombre de pas</label>
            <input type="number" min="0" placeholder="ex: 8000"
              value={form.steps}
              onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
              className="input-field" />
          </div>

          {/* Intensité */}
          <div>
            <label className="label">Intensité</label>
            <div className="flex gap-2">
              {INTENSITIES.map((i) => (
                <button key={i.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, intensity: i.value }))}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${form.intensity === i.value ? "border-health-blue bg-health-blue-light text-health-blue" : "border-gray-100 text-gray-600"}`}>
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estimation calories */}
          {estimatedCal !== null && (
            <div className="bg-orange-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-orange-500 text-lg">🔥</span>
              <p className="text-sm text-orange-700">Estimation : <span className="font-bold">{estimatedCal} kcal</span> brûlées</p>
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <input placeholder="Sensations, lieu, équipement…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="input-field" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t("Annuler", "Cancel")}</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t("Enregistrement…", "Saving…") : t("Ajouter", "Add")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
