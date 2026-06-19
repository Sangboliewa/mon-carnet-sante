"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";

type MealTypeKey = "petit_dejeuner" | "dejeuner" | "diner" | "collation";

interface NutritionLog {
  id: string;
  person_id: string;
  user_id: string;
  log_date: string;
  meal_type: MealTypeKey;
  description: string;
  calories: number | null;
  proteins_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  notes: string | null;
}

interface WaterLog {
  id: string;
  person_id: string;
  user_id: string;
  log_date: string;
  glasses_count: number;
}

interface WeekDay { date: string; label: string; calories: number }

const MEAL_TYPE_LABELS: Record<MealTypeKey, string> = {
  petit_dejeuner: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
};

const MEAL_ICONS: Record<MealTypeKey, string> = {
  petit_dejeuner: "🌅",
  dejeuner: "🍽️",
  diner: "🌙",
  collation: "🍎",
};

const MEAL_COLORS: Record<MealTypeKey, string> = {
  petit_dejeuner: "bg-amber-100 text-amber-800 border-amber-200",
  dejeuner: "bg-green-100 text-green-800 border-green-200",
  diner: "bg-indigo-100 text-indigo-800 border-indigo-200",
  collation: "bg-pink-100 text-pink-800 border-pink-200",
};

const MEAL_BORDER: Record<MealTypeKey, string> = {
  petit_dejeuner: "#f59e0b",
  dejeuner: "#22c55e",
  diner: "#6366f1",
  collation: "#ec4899",
};

const MEAL_TYPES = Object.keys(MEAL_TYPE_LABELS) as MealTypeKey[];
const CALORIE_GOAL = 2000;
const WATER_GOAL = 8;

function toDateString(d: Date) { return d.toISOString().split("T")[0]; }

export default function NutritionClient({ personId }: { personId: string }) {
  const supabase = createClient();
  const today = toDateString(new Date());

  const [selectedDate, setSelectedDate] = useState(today);
  const [meals, setMeals] = useState<NutritionLog[]>([]);
  const [waterLog, setWaterLog] = useState<WaterLog | null>(null);
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<NutritionLog | null>(null);
  const [form, setForm] = useState({
    meal_type: "dejeuner" as MealTypeKey,
    description: "",
    calories: "",
    proteins_g: "",
    carbs_g: "",
    fats_g: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({ meal_type: "dejeuner", description: "", calories: "", proteins_g: "", carbs_g: "", fats_g: "", notes: "" });
    setEditingMeal(null);
    setShowAddMeal(false);
  };

  const fetchDayData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [mealsRes, waterRes] = await Promise.all([
      supabase.from("nutrition_logs").select("*").eq("person_id", personId).eq("user_id", user.id).eq("log_date", selectedDate).order("created_at"),
      supabase.from("water_logs").select("*").eq("person_id", personId).eq("user_id", user.id).eq("log_date", selectedDate).maybeSingle(),
    ]);
    if (mealsRes.error) setError(mealsRes.error.message);
    else setMeals((mealsRes.data ?? []) as NutritionLog[]);
    setWaterLog(waterRes.data as WaterLog | null);
    setLoading(false);
  }, [selectedDate, personId]);

  const fetchWeekData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { date: toDateString(d), label: d.toLocaleDateString("fr-FR", { weekday: "short" }), calories: 0 };
    });
    const { data } = await supabase.from("nutrition_logs").select("log_date, calories")
      .eq("person_id", personId).eq("user_id", user.id)
      .gte("log_date", days[0].date).lte("log_date", days[6].date);
    if (data) {
      for (const row of data) {
        const day = days.find((d) => d.date === row.log_date);
        if (day && row.calories) day.calories += row.calories;
      }
    }
    setWeekData(days);
  }, [personId]);

  useEffect(() => { fetchDayData(); }, [fetchDayData]);
  useEffect(() => { fetchWeekData(); }, [fetchWeekData]);

  const handleWaterToggle = async (targetGlasses: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = waterLog?.glasses_count ?? 0;
    const newCount = Math.max(0, current === targetGlasses ? targetGlasses - 1 : targetGlasses);
    if (waterLog) {
      const { error: err } = await supabase.from("water_logs").update({ glasses_count: newCount }).eq("id", waterLog.id);
      if (!err) setWaterLog({ ...waterLog, glasses_count: newCount });
    } else {
      const { data, error: err } = await supabase.from("water_logs")
        .insert({ person_id: personId, user_id: user.id, log_date: selectedDate, glasses_count: newCount })
        .select().single();
      if (!err && data) setWaterLog(data as WaterLog);
    }
  };

  const handleSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      person_id: personId, user_id: user.id, log_date: selectedDate,
      meal_type: form.meal_type, description: form.description,
      calories: form.calories ? Number(form.calories) : null,
      proteins_g: form.proteins_g ? Number(form.proteins_g) : null,
      carbs_g: form.carbs_g ? Number(form.carbs_g) : null,
      fats_g: form.fats_g ? Number(form.fats_g) : null,
      notes: form.notes || null,
    };
    if (editingMeal) {
      const { error: err } = await supabase.from("nutrition_logs").update(payload).eq("id", editingMeal.id);
      if (err) { setError(err.message); return; }
    } else {
      const { error: err } = await supabase.from("nutrition_logs").insert(payload);
      if (err) { setError(err.message); return; }
    }
    resetForm(); fetchDayData(); fetchWeekData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce repas ?")) return;
    const { error: err } = await supabase.from("nutrition_logs").delete().eq("id", id);
    if (err) setError(err.message);
    else { fetchDayData(); fetchWeekData(); }
  };

  const totalCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProteins = meals.reduce((s, m) => s + (m.proteins_g ?? 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0);
  const totalFats = meals.reduce((s, m) => s + (m.fats_g ?? 0), 0);
  const totalMacros = totalProteins + totalCarbs + totalFats;
  const caloriesPct = Math.min((totalCalories / CALORIE_GOAL) * 100, 100);
  const glassCount = waterLog?.glasses_count ?? 0;
  const maxCal = Math.max(...weekData.map((d) => d.calories), CALORIE_GOAL, 1);
  const W = 300; const H = 100; const barW = 30; const gap = (W - 7 * barW) / 8;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Sélecteur date */}
      <div className="card flex items-center gap-3">
        <label className="label mb-0 shrink-0 text-sm">Date :</label>
        <input type="date" className="input-field flex-1" value={selectedDate} max={today}
          onChange={(e) => setSelectedDate(e.target.value)} />
        {selectedDate !== today && (
          <button className="text-sm text-health-blue font-medium shrink-0" onClick={() => setSelectedDate(today)}>
            Aujourd&apos;hui
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm">{error}</div>}

      {/* Eau */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <span>💧</span> Eau
          </h2>
          <span className="text-sm font-bold text-blue-600">{glassCount}/{WATER_GOAL} verres</span>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {Array.from({ length: WATER_GOAL }, (_, i) => i + 1).map((g) => (
            <button key={g} onClick={() => handleWaterToggle(g)}
              className={`text-2xl transition-all rounded-full p-1 active:scale-90 ${g <= glassCount ? "opacity-100 scale-110" : "opacity-25 grayscale"}`}>
              🥛
            </button>
          ))}
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${(glassCount / WATER_GOAL) * 100}%` }} />
        </div>
        {glassCount >= WATER_GOAL && (
          <p className="text-xs text-blue-600 font-semibold mt-1.5">🎉 Objectif eau atteint !</p>
        )}
      </div>

      {/* Résumé du jour */}
      <div className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm"><span>📊</span> Résumé du jour</h2>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Calories</span>
          <span className={totalCalories > CALORIE_GOAL ? "text-red-600 font-bold" : "text-gray-700 font-semibold"}>
            {totalCalories} / {CALORIE_GOAL} kcal
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-3">
          <div className={`h-full rounded-full transition-all ${totalCalories > CALORIE_GOAL ? "bg-red-500" : "bg-green-500"}`}
            style={{ width: `${caloriesPct}%` }} />
        </div>
        {totalMacros > 0 && (
          <>
            <div className="flex h-4 rounded-full overflow-hidden text-xs font-bold text-white">
              {totalProteins > 0 && (
                <div className="flex items-center justify-center bg-blue-500" style={{ width: `${(totalProteins / totalMacros) * 100}%` }}>P</div>
              )}
              {totalCarbs > 0 && (
                <div className="flex items-center justify-center bg-yellow-400 text-yellow-900" style={{ width: `${(totalCarbs / totalMacros) * 100}%` }}>G</div>
              )}
              {totalFats > 0 && (
                <div className="flex items-center justify-center bg-orange-400" style={{ width: `${(totalFats / totalMacros) * 100}%` }}>L</div>
              )}
            </div>
            <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
              <span className="text-blue-600">P {totalProteins.toFixed(1)}g</span>
              <span className="text-yellow-600">G {totalCarbs.toFixed(1)}g</span>
              <span className="text-orange-600">L {totalFats.toFixed(1)}g</span>
            </div>
          </>
        )}
      </div>

      {/* Graphique 7 jours */}
      <div className="card">
        <h2 className="font-semibold mb-2 text-sm flex items-center gap-2"><span>📈</span> 7 derniers jours</h2>
        <svg viewBox={`0 0 ${W} ${H + 20}`} width="100%">
          <line x1={0} x2={W} y1={H - (CALORIE_GOAL / maxCal) * H} y2={H - (CALORIE_GOAL / maxCal) * H}
            stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />
          {weekData.map((day, i) => {
            const barH = Math.max(day.calories > 0 ? 4 : 0, (day.calories / maxCal) * H);
            const x = gap + i * (barW + gap);
            const isSel = day.date === selectedDate;
            const isToday = day.date === today;
            return (
              <g key={day.date} onClick={() => setSelectedDate(day.date)} className="cursor-pointer">
                <rect x={x} y={H - barH} width={barW} height={barH} rx={4}
                  fill={isSel ? "#3b82f6" : day.calories > CALORIE_GOAL ? "#f87171" : isToday ? "#86efac" : "#93c5fd"} />
                <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={10}
                  fill={isSel ? "#3b82f6" : "#6b7280"} fontWeight={isToday ? "700" : "400"}>
                  {day.label}
                </text>
                {day.calories > 0 && barH > 18 && (
                  <text x={x + barW / 2} y={H - barH + 12} textAnchor="middle" fontSize={9} fill="white" fontWeight="600">
                    {day.calories}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Repas du jour */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm flex items-center gap-2"><span>🍽️</span> Repas du jour</h2>
          {!showAddMeal && (
            <button className="btn-primary w-auto px-4 py-2 text-sm" onClick={() => setShowAddMeal(true)}>+ Ajouter</button>
          )}
        </div>

        {(showAddMeal || editingMeal) && (
          <form onSubmit={handleSubmitMeal} className="mb-4 p-3 border border-blue-100 rounded-xl bg-blue-50/40 space-y-3">
            {/* Meal type — visual buttons */}
            <div>
              <label className="label">Type de repas</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {MEAL_TYPES.map((t) => (
                  <button key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, meal_type: t }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.meal_type === t ? "border-health-blue bg-health-blue-light text-health-blue" : "border-gray-100 text-gray-600"}`}>
                    <span className="text-lg">{MEAL_ICONS[t]}</span>
                    {MEAL_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Description *</label>
              <input type="text" className="input-field" required placeholder="ex: Riz au poisson, sauce gombo"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Calories (kcal)</label>
                <input type="number" className="input-field" min={0} placeholder="ex: 450"
                  value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "proteins_g", label: "Protéines (g)" },
                { key: "carbs_g",    label: "Glucides (g)" },
                { key: "fats_g",     label: "Lipides (g)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label text-xs">{label}</label>
                  <input type="number" className="input-field" min={0} step="0.1" placeholder="0"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-sm py-2" onClick={resetForm}>Annuler</button>
              <button type="submit" className="btn-primary text-sm py-2">{editingMeal ? "Modifier" : "Ajouter"}</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>
        ) : meals.length === 0 && !showAddMeal ? (
          <div className="text-center py-10 space-y-3">
            <div className="text-5xl">🍽️</div>
            <p className="font-semibold text-gray-800">Aucun repas enregistré</p>
            <p className="text-sm text-gray-500 leading-relaxed px-4">
              Note ce que tu manges pour suivre tes apports et atteindre tes objectifs nutritionnels.
            </p>
            <button onClick={() => setShowAddMeal(true)}
              className="inline-block bg-green-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
              + Ajouter mon premier repas
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {meals.map((meal) => (
              <li key={meal.id}
                className="flex items-start gap-3 rounded-xl border-l-4 border border-gray-100 bg-white px-3 py-2.5"
                style={{ borderLeftColor: MEAL_BORDER[meal.meal_type] }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: MEAL_BORDER[meal.meal_type] + "18" }}>
                  {MEAL_ICONS[meal.meal_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${MEAL_COLORS[meal.meal_type]}`}>
                      {MEAL_TYPE_LABELS[meal.meal_type]}
                    </span>
                    {meal.calories != null && (
                      <span className="text-xs font-bold text-gray-700 ml-auto">{meal.calories} kcal</span>
                    )}
                  </div>
                  <p className="font-medium text-sm text-gray-900 mt-1">{meal.description}</p>
                  {(meal.proteins_g || meal.carbs_g || meal.fats_g) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {meal.proteins_g != null && `P: ${meal.proteins_g}g  `}
                      {meal.carbs_g != null && `G: ${meal.carbs_g}g  `}
                      {meal.fats_g != null && `L: ${meal.fats_g}g`}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => {
                    setEditingMeal(meal);
                    setForm({
                      meal_type: meal.meal_type,
                      description: meal.description,
                      calories: meal.calories?.toString() ?? "",
                      proteins_g: meal.proteins_g?.toString() ?? "",
                      carbs_g: meal.carbs_g?.toString() ?? "",
                      fats_g: meal.fats_g?.toString() ?? "",
                      notes: meal.notes ?? "",
                    });
                    setShowAddMeal(true);
                  }} className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-500">✏️</button>
                  <button onClick={() => handleDelete(meal.id)}
                    className="text-xs px-2 py-1 rounded border border-red-200 bg-red-50 text-red-500">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
