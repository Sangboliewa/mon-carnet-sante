"use client";
import { useState } from "react";
import { COUNTRY_CALENDARS, getMissingVaccines } from "@/lib/vaccination-calendars";
import { useLang } from "@/lib/i18n/LanguageContext";
import type { VaccineScheduleEntry } from "@/lib/vaccination-calendars";

interface Props {
  receivedNames: string[];
  ageMonths: number;
  personFirstName: string;
}

const CATEGORY_COLORS = {
  obligatoire: { bg: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
  recommande:  { bg: "bg-blue-50 border-blue-200",   badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
  voyage:      { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
};

const CATEGORY_LABELS = { obligatoire: "PEV national", recommande: "Recommandé", voyage: "Voyage" };

// Group entries by age slot
function groupByAge(entries: VaccineScheduleEntry[]) {
  const map = new Map<string, VaccineScheduleEntry[]>();
  for (const e of entries) {
    const key = e.ageLabel;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}

export default function CalendrierClient({ receivedNames, ageMonths, personFirstName }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [selectedCountry, setSelectedCountry] = useState("CI");
  const [filterMissing, setFilterMissing] = useState(false);
  const [expandedAge, setExpandedAge] = useState<string | null>(null);

  const calendar = COUNTRY_CALENDARS.find(c => c.code === selectedCountry) ?? COUNTRY_CALENDARS[0];
  const missing = getMissingVaccines(calendar, receivedNames, ageMonths);
  const missingIds = new Set(missing.map(m => m.vaccine));

  const receivedLower = receivedNames.map(n => n.toLowerCase());
  function isReceived(entry: VaccineScheduleEntry) {
    return receivedLower.some(r =>
      r.includes(entry.vaccine.toLowerCase()) ||
      r.includes(entry.fullName.toLowerCase().split(" ")[1] ?? "")
    );
  }

  const schedule = filterMissing ? missing : calendar.schedule;
  const grouped = groupByAge([...schedule].sort((a, b) => a.ageWeeks - b.ageWeeks));

  const totalReceived = calendar.schedule.filter(isReceived).length;
  const pct = Math.round((totalReceived / calendar.schedule.length) * 100);

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Country selector */}
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Pays / programme national</p>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_CALENDARS.map(c => (
            <button key={c.code} onClick={() => setSelectedCountry(c.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                selectedCountry === c.code
                  ? "border-green-500 bg-green-500 text-white font-semibold"
                  : "border-gray-200 bg-white text-gray-600"
              }`}>
              <span>{c.flag}</span>{c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-gray-800">
            {personFirstName ? `Couverture vaccinale — ${personFirstName}` : "Couverture vaccinale"}
          </p>
          <span className={`text-lg font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {pct}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {totalReceived} / {calendar.schedule.length} vaccins enregistrés — {missing.length} manquant(s) pour l'âge actuel
        </p>

        {ageMonths === 0 && (
          <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded-lg px-2 py-1">
            ℹ️ Renseignez la date de naissance dans le profil pour une analyse par âge
          </p>
        )}
      </div>

      {/* Missing alert */}
      {missing.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">⚠️ {missing.length} vaccin(s) non enregistré(s) pour cet âge</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {missing.slice(0, 8).map(m => (
              <span key={m.vaccine} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{m.vaccine}</span>
            ))}
            {missing.length > 8 && <span className="text-xs text-red-500">+{missing.length - 8} autres</span>}
          </div>
        </div>
      )}

      {/* Filter toggle */}
      <div className="flex gap-2">
        <button onClick={() => setFilterMissing(false)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${!filterMissing ? "bg-green-600 text-white" : "border border-gray-200 text-gray-600"}`}>
          Tout le calendrier
        </button>
        <button onClick={() => setFilterMissing(true)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${filterMissing ? "bg-red-500 text-white" : "border border-gray-200 text-gray-600"}`}>
          Manquants seulement
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs text-gray-500">
        {(["obligatoire", "recommande", "voyage"] as const).map(cat => (
          <span key={cat} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat].dot}`} />
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>

      {/* Schedule grouped by age */}
      <div className="space-y-3">
        {grouped.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            {filterMissing ? t("✅ Aucun vaccin manquant pour cet âge !", "✅ No missing vaccines for this age!") : t("Aucun vaccin dans ce calendrier", "No vaccines in this schedule")}
          </p>
        )}

        {grouped.map(([ageLabel, entries]) => {
          const isExpanded = expandedAge === ageLabel;
          const allReceived = entries.every(isReceived);
          const someReceived = entries.some(isReceived);

          return (
            <div key={ageLabel} className="bg-white rounded-2xl border overflow-hidden">
              {/* Age header — clickable */}
              <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setExpandedAge(isExpanded ? null : ageLabel)}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${allReceived ? "bg-green-500" : someReceived ? "bg-amber-500" : "bg-gray-300"}`}>
                    {allReceived ? "✓" : entries.length}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{ageLabel}</p>
                    <p className="text-xs text-gray-500">{entries.length} vaccin{entries.length > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? "↑" : "↓"}</span>
              </button>

              {/* Vaccine list */}
              {isExpanded && (
                <div className="border-t divide-y divide-gray-50">
                  {entries.map(entry => {
                    const received = isReceived(entry);
                    const isMissing = missingIds.has(entry.vaccine);
                    const colors = CATEGORY_COLORS[entry.category];
                    return (
                      <div key={entry.vaccine} className={`px-4 py-3 ${received ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900">{entry.vaccine}</p>
                                {received && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Reçu</span>}
                                {isMissing && !received && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">⚠ Manquant</span>}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{entry.fullName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Cible : {entry.disease}</p>
                              {entry.notes && <p className="text-xs text-blue-600 mt-1 italic">{entry.notes}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.badge}`}>{CATEGORY_LABELS[entry.category]}</span>
                            <span className="text-xs text-gray-400">{entry.doses} dose{entry.doses > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Source note */}
      <p className="text-xs text-gray-400 text-center">
        Données : OMS / UNICEF / Ministères de la Santé — PEV 2024.<br />
        Consultez un professionnel de santé pour un suivi personnalisé.
      </p>
    </div>
  );
}
