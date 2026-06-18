"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface SleepLog {
  id: string;
  log_date: string;
  bedtime: string | null;
  wake_time: string | null;
  duration_min: number | null;
  quality: number | null;
  notes: string | null;
}

interface Props { personId: string }

const QUALITY_LABELS: Record<number, { label: string; icon: string; color: string }> = {
  1: { label: "Très mauvais", icon: "😩", color: "text-red-600 bg-red-50" },
  2: { label: "Mauvais",      icon: "😔", color: "text-orange-600 bg-orange-50" },
  3: { label: "Moyen",        icon: "😐", color: "text-amber-600 bg-amber-50" },
  4: { label: "Bon",          icon: "😊", color: "text-green-600 bg-green-50" },
  5: { label: "Excellent",    icon: "😴", color: "text-health-blue bg-health-blue-light" },
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function calcDuration(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60; // coucher avant minuit, réveil après
  return mins;
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function SleepChart({ logs }: { logs: SleepLog[] }) {
  const days: { date: string; label: string; hours: number; quality: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const log = logs.find((l) => l.log_date === dateStr);
    const hours = log?.duration_min ? log.duration_min / 60 : 0;
    days.push({
      date: dateStr,
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3),
      hours,
      quality: log?.quality ?? 0,
    });
  }

  const GOAL = 8;
  const maxH = Math.max(...days.map((d) => d.hours), GOAL);
  const W = 300; const H = 100; const barW = 30; const gap = 12;

  const qualityColor = (q: number) => q >= 4 ? "#2EA87E" : q >= 3 ? "#f59e0b" : q >= 1 ? "#ef4444" : "#93c5fd";

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Durée sommeil — 7 jours</p>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
        {/* Objectif 8h */}
        <line x1="0" y1={H - (GOAL / maxH) * H} x2={W} y2={H - (GOAL / maxH) * H}
          stroke="#1E6FBF" strokeWidth="1" strokeDasharray="3 3" />
        <text x={W - 2} y={H - (GOAL / maxH) * H - 3} textAnchor="end" fontSize="7" fill="#1E6FBF">8h</text>

        {days.map((d, i) => {
          const x = i * (barW + gap) + gap / 2;
          const barH = d.hours > 0 ? Math.max((d.hours / maxH) * H, 4) : 0;
          const isToday = d.date === todayStr();
          return (
            <g key={d.date}>
              <rect x={x} y={H - barH} width={barW} height={barH} rx="4"
                fill={d.hours > 0 ? qualityColor(d.quality) : "#e5e7eb"} />
              {d.hours > 0 && (
                <text x={x + barW / 2} y={H - barH - 3} textAnchor="middle" fontSize="7" fill="#374151">
                  {d.hours.toFixed(1)}h
                </text>
              )}
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="8"
                fill={isToday ? "#1E6FBF" : "#6b7280"} fontWeight={isToday ? "bold" : "normal"}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-health-green inline-block" /> Bon (4-5)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Moyen (3)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Mauvais (1-2)</span>
      </div>
    </div>
  );
}

export default function SommeilClient({ personId }: Props) {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    log_date: todayStr(),
    bedtime: "22:00",
    wake_time: "06:00",
    quality: 4,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("person_id", personId)
        .gte("log_date", since.toISOString().split("T")[0])
        .order("log_date", { ascending: false });
      setLogs((data as SleepLog[]) ?? []);
      setLoading(false);
    })();
  }, [personId]);

  const duration = form.bedtime && form.wake_time ? calcDuration(form.bedtime, form.wake_time) : null;

  // Moyenne 7j
  const last7 = logs.filter((l) => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return new Date(l.log_date) >= d;
  });
  const avgHours = last7.length > 0
    ? (last7.reduce((s, l) => s + (l.duration_min ?? 0), 0) / last7.length / 60).toFixed(1)
    : null;
  const avgQuality = last7.length > 0
    ? Math.round(last7.reduce((s, l) => s + (l.quality ?? 3), 0) / last7.length)
    : null;

  function openAdd() {
    setEditId(null);
    setForm({ log_date: todayStr(), bedtime: "22:00", wake_time: "06:00", quality: 4, notes: "" });
    setError(null);
    setShowForm(true);
  }

  function openEdit(log: SleepLog) {
    setEditId(log.id);
    setForm({
      log_date: log.log_date,
      bedtime: log.bedtime ?? "22:00",
      wake_time: log.wake_time ?? "06:00",
      quality: log.quality ?? 4,
      notes: log.notes ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const supabase = createClient();
    const payload = {
      person_id: personId,
      log_date: form.log_date,
      bedtime: form.bedtime || null,
      wake_time: form.wake_time || null,
      duration_min: duration,
      quality: form.quality,
      notes: form.notes || null,
    };
    if (editId) {
      const { error: err } = await supabase.from("sleep_logs").update(payload).eq("id", editId);
      if (err) { setError(err.message); setSaving(false); return; }
      setLogs((prev) => prev.map((l) => l.id === editId ? { ...l, ...payload } : l));
    } else {
      const { data, error: err } = await supabase.from("sleep_logs").insert(payload).select().single();
      if (err || !data) { setError(err?.message ?? "Erreur"); setSaving(false); return; }
      setLogs((prev) => [data as SleepLog, ...prev]);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette nuit ?")) return;
    const supabase = createClient();
    await supabase.from("sleep_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  if (loading) return <div className="px-4 py-10 text-center text-gray-400 text-sm">Chargement…</div>;

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Résumé 7j */}
      {avgHours && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center py-3">
            <p className="text-3xl font-extrabold text-health-blue">{avgHours}h</p>
            <p className="text-xs text-gray-500 mt-1">Moy. 7 jours</p>
            <p className={`text-xs font-medium mt-0.5 ${parseFloat(avgHours) >= 7 ? "text-green-600" : "text-amber-600"}`}>
              {parseFloat(avgHours) >= 8 ? "Excellent" : parseFloat(avgHours) >= 7 ? "Bon" : parseFloat(avgHours) >= 6 ? "Insuffisant" : "Trop peu"}
            </p>
          </div>
          {avgQuality && QUALITY_LABELS[avgQuality] && (
            <div className="card text-center py-3">
              <p className="text-3xl">{QUALITY_LABELS[avgQuality].icon}</p>
              <p className="text-xs text-gray-500 mt-1">Qualité moy.</p>
              <p className="text-xs font-medium text-gray-700 mt-0.5">{QUALITY_LABELS[avgQuality].label}</p>
            </div>
          )}
        </div>
      )}

      {/* Graphique */}
      <SleepChart logs={logs} />

      {/* Recommandation */}
      {avgHours && parseFloat(avgHours) < 7 && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-1">💡 Conseil</p>
          <p className="text-xs text-amber-800">
            Votre moyenne est de {avgHours}h. Les adultes ont besoin de 7 à 9h de sommeil par nuit pour une santé optimale.
          </p>
        </div>
      )}

      {/* Liste logs 30j */}
      <div className="space-y-3">
        {logs.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">Aucune nuit enregistrée</p>
        )}
        {logs.map((log) => {
          const q = log.quality ? QUALITY_LABELS[log.quality] : null;
          return (
            <div key={log.id} className="card flex items-center gap-3">
              <span className="text-2xl">{q?.icon ?? "😴"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(log.log_date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  {q && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.color}`}>{q.label}</span>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 flex-wrap">
                  {log.bedtime && log.wake_time && (
                    <span className="text-xs text-gray-500">{log.bedtime.slice(0, 5)} → {log.wake_time.slice(0, 5)}</span>
                  )}
                  {log.duration_min && (
                    <span className="text-xs font-medium text-health-blue">{fmtDuration(log.duration_min)}</span>
                  )}
                </div>
                {log.notes && <p className="text-xs text-gray-400 italic mt-0.5">{log.notes}</p>}
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <button onClick={() => openEdit(log)} className="text-xs text-gray-400 hover:text-gray-600">Modifier</button>
                <button onClick={() => handleDelete(log.id)} className="text-xs text-red-400 hover:text-red-600">Suppr.</button>
              </div>
            </div>
          );
        })}
      </div>

      {!showForm && (
        <button onClick={openAdd} className="btn-primary">+ Enregistrer une nuit</button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-health-blue border-2">
          <h3 className="font-bold text-gray-900">{editId ? "Modifier" : "Nouvelle nuit"}</h3>
          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className="label">Date du réveil</label>
            <input type="date" max={todayStr()} value={form.log_date}
              onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value }))}
              className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Heure coucher</label>
              <input type="time" value={form.bedtime}
                onChange={(e) => setForm((f) => ({ ...f, bedtime: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="label">Heure réveil</label>
              <input type="time" value={form.wake_time}
                onChange={(e) => setForm((f) => ({ ...f, wake_time: e.target.value }))}
                className="input-field" />
            </div>
          </div>

          {duration !== null && (
            <div className="bg-health-blue-light rounded-xl px-3 py-2 text-center">
              <p className="text-health-blue font-bold text-lg">{fmtDuration(duration)}</p>
              <p className="text-xs text-health-blue">de sommeil</p>
            </div>
          )}

          {/* Qualité */}
          <div>
            <label className="label">Qualité du sommeil</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => {
                const qi = QUALITY_LABELS[q];
                return (
                  <button key={q} type="button"
                    onClick={() => setForm((f) => ({ ...f, quality: q }))}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${form.quality === q ? "border-health-blue bg-health-blue-light" : "border-gray-100"}`}>
                    <span className="text-xl">{qi.icon}</span>
                    <span className="text-xs text-gray-600">{q}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-center text-gray-500 mt-1">{QUALITY_LABELS[form.quality]?.label}</p>
          </div>

          <div>
            <label className="label">Notes</label>
            <input placeholder="Réveils nocturnes, rêves, cauchemars…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="input-field" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Enregistrement…" : editId ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
