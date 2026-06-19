"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ScoreItem {
  label: string;
  done: boolean;
  href: string;
}

interface Props {
  score: number;
  items: ScoreItem[];
}

export default function HealthScoreCard({ score, items }: Props) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(score), 300);
    return () => clearTimeout(timeout);
  }, [score]);

  const r = 38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animated / 100) * circumference;

  const scoreColor =
    score >= 75 ? "#2EA87E" :
    score >= 50 ? "#F59E0B" :
    "#EF4444";

  const scoreLabel =
    score >= 75 ? "Excellent" :
    score >= 50 ? "Bon niveau" :
    score >= 25 ? "À améliorer" :
    "Commençons !";

  const pending = items.filter(i => !i.done);

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {/* SVG Circle */}
        <div className="relative shrink-0">
          <svg width="92" height="92" viewBox="0 0 92 92">
            <circle
              cx="46" cy="46" r={r}
              fill="none"
              stroke="#F3F4F6"
              strokeWidth="8"
            />
            <circle
              cx="46" cy="46" r={r}
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 46 46)"
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <text x="46" y="46" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900" style={{ fontSize: 18, fontWeight: 700 }}>
              {score}
            </text>
            <text x="46" y="60" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: "#6B7280" }}>
              /100
            </text>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Score Santé</p>
          <p className="font-bold text-gray-900 text-base leading-tight">{scoreLabel}</p>
          {pending.length > 0 ? (
            <p className="text-xs text-gray-500 mt-1">
              {pending.length} action{pending.length > 1 ? "s" : ""} pour progresser
            </p>
          ) : (
            <p className="text-xs text-green-600 mt-1 font-medium">🎉 Profil complet !</p>
          )}
        </div>
      </div>

      {/* Progress items */}
      {pending.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {pending.slice(0, 3).map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-center gap-2 group"
            >
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0 group-hover:border-health-blue transition-colors" />
              <span className="text-sm text-gray-600 group-hover:text-health-blue transition-colors">{item.label}</span>
              <span className="ml-auto text-gray-300 text-xs group-hover:text-health-blue">→</span>
            </Link>
          ))}
          {pending.length > 3 && (
            <p className="text-xs text-gray-400 pl-6">+{pending.length - 3} autre{pending.length - 3 > 1 ? "s" : ""}…</p>
          )}
        </div>
      )}
    </div>
  );
}
