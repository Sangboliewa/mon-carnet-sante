"use client";
import { useEffect, useState } from "react";

export default function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const stored = localStorage.getItem("health_streak");
      const data = stored ? JSON.parse(stored) : null;

      if (!data) {
        const next = { count: 1, last: today };
        localStorage.setItem("health_streak", JSON.stringify(next));
        setStreak(1);
        return;
      }

      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (data.last === today) {
        setStreak(data.count);
      } else if (data.last === yesterday) {
        const next = { count: data.count + 1, last: today };
        localStorage.setItem("health_streak", JSON.stringify(next));
        setStreak(next.count);
      } else {
        const next = { count: 1, last: today };
        localStorage.setItem("health_streak", JSON.stringify(next));
        setStreak(1);
      }
    } catch {
      setStreak(1);
    }
  }, []);

  if (streak === null) return null;

  return (
    <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
      <span className="text-base">🔥</span>
      <span className="text-xs font-semibold text-orange-700">{streak} jour{streak > 1 ? "s" : ""}</span>
    </div>
  );
}
