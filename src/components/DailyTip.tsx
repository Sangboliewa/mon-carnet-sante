"use client";
import { getTodaysTip, TIP_COLORS } from "@/lib/dailyTips";
import { useState } from "react";

export default function DailyTip() {
  const tip = getTodaysTip();
  const colors = TIP_COLORS[tip.color] ?? TIP_COLORS.blue;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card ${colors.bg} ${colors.border} border cursor-pointer select-none`} onClick={() => setExpanded(v => !v)}>
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0 mt-0.5">{tip.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.tag}`}>
              Conseil du jour · {tip.categoryLabel}
            </span>
          </div>
          <p className={`font-semibold text-sm ${colors.text}`}>{tip.title}</p>
          {expanded && (
            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{tip.body}</p>
          )}
        </div>
        <span className={`text-gray-400 text-xs mt-1 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>▼</span>
      </div>
    </div>
  );
}
