"use client";
import { useI18n, type Locale } from "@/lib/i18n/context";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
      {(["fr", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
            locale === l
              ? "bg-white text-health-blue shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
