"use client";
import { useLang } from "@/lib/i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1 bg-white/20 rounded-full px-1 py-0.5">
      <button
        onClick={() => setLang("fr")}
        className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-all ${
          lang === "fr" ? "bg-white text-health-blue" : "text-white/80"
        }`}
      >
        FR
      </button>
      <button
        onClick={() => setLang("en")}
        className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-all ${
          lang === "en" ? "bg-white text-health-blue" : "text-white/80"
        }`}
      >
        EN
      </button>
    </div>
  );
}
