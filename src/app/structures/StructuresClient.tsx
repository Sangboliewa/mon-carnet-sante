"use client";
import { useState, useMemo, useEffect } from "react";
import { STRUCTURES, COUNTRIES, TYPE_ICONS, STRUCTURE_TYPES, haversine } from "@/lib/structures-data";
import type { HealthStructure } from "@/lib/structures-data";
import { useLang } from "@/lib/i18n/LanguageContext";

interface GeoPos { lat: number; lng: number }

function DistanceBadge({ dist }: { dist: number }) {
  const color = dist < 2 ? "bg-green-100 text-green-700" : dist < 10 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}</span>;
}

function StructureCard({ s, userPos, t }: { s: HealthStructure; userPos: GeoPos | null; t: (fr: string, en: string) => string }) {
  const dist = userPos ? haversine(userPos.lat, userPos.lng, s.lat, s.lng) : null;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`;

  return (
    <div className="card space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-xl flex-shrink-0">
            {TYPE_ICONS[s.type]}
          </div>
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm leading-tight">{s.name}</p>
            {s.urgence && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">{t("🚨 Urgences", "🚨 Emergency")}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{s.type} · {s.city}, {s.country}</p>
          <p className="text-xs text-gray-400">{s.address}</p>
          {s.opening_hours && <p className="text-xs text-teal-600 mt-0.5">🕐 {s.opening_hours}</p>}
          {s.specialties && s.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {s.specialties.slice(0, 3).map((sp, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{sp}</span>
              ))}
            </div>
          )}
        </div>
        </div>
        {dist !== null && <DistanceBadge dist={dist} />}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-50">
        <a href={`tel:${s.phone.replace(/\s/g, "")}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium">
          {t("📞 Appeler", "📞 Call")}
        </a>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-medium">
          🗺️ Maps
        </a>
        <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-medium">
          🚗 Waze
        </a>
      </div>
    </div>
  );
}

export default function StructuresClient() {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("CI");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [urgenceOnly, setUrgenceOnly] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [userPos, setUserPos] = useState<GeoPos | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function locateMe() {
    if (!navigator.geolocation) { setGeoError(t("Géolocalisation non supportée", "Geolocation not supported")); return; }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortByDistance(true);
        setCountryFilter("ALL");
        setGeoLoading(false);
      },
      err => {
        setGeoError(err.code === 1 ? t("Autorisation refusée", "Permission denied") : t("Impossible d'obtenir la position", "Unable to get location"));
        setGeoLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = STRUCTURES.filter(s => {
      if (countryFilter !== "ALL" && s.countryCode !== countryFilter) return false;
      if (typeFilter !== "Tous" && s.type !== typeFilter) return false;
      if (urgenceOnly && !s.urgence) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.city.toLowerCase().includes(q) && !s.type.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortByDistance && userPos) {
      result = [...result].sort((a, b) =>
        haversine(userPos.lat, userPos.lng, a.lat, a.lng) -
        haversine(userPos.lat, userPos.lng, b.lat, b.lng)
      );
    }
    return result;
  }, [query, countryFilter, typeFilter, urgenceOnly, sortByDistance, userPos]);

  const nearestUrgence = useMemo(() => {
    if (!userPos) return null;
    return STRUCTURES
      .filter(s => s.urgence)
      .sort((a, b) =>
        haversine(userPos.lat, userPos.lng, a.lat, a.lng) -
        haversine(userPos.lat, userPos.lng, b.lat, b.lng)
      )[0] ?? null;
  }, [userPos]);

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Géolocalisation */}
      <div className="bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-800">
              {userPos ? t("📍 Position détectée", "📍 Location detected") : t("📍 Me géolocaliser", "📍 Locate me")}
            </p>
            <p className="text-xs text-teal-600 mt-0.5">
              {userPos
                ? `${t("Tri par distance activé", "Sort by distance enabled")} · ${filtered.length} ${t("structures", "facilities")}`
                : t("Trouver les structures les plus proches", "Find the nearest health facilities")}
            </p>
          </div>
          <button onClick={locateMe} disabled={geoLoading}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              userPos ? "bg-teal-600 text-white" : "bg-white border border-teal-400 text-teal-700"
            } disabled:opacity-50`}>
            {geoLoading ? "…" : userPos ? t("✓ Localisé", "✓ Located") : t("Localiser", "Locate")}
          </button>
        </div>
        {geoError && <p className="text-xs text-red-600 mt-1.5">{geoError}</p>}
      </div>

      {/* Urgence la plus proche */}
      {nearestUrgence && (() => {
        const dist = haversine(userPos!.lat, userPos!.lng, nearestUrgence.lat, nearestUrgence.lng);
        return (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1.5">{t("🚨 Urgences les plus proches", "🚨 Nearest emergency")}</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-900">{nearestUrgence.name}</p>
                <p className="text-xs text-gray-500">{nearestUrgence.city}</p>
              </div>
              <DistanceBadge dist={dist} />
            </div>
            <div className="flex gap-2 mt-2">
              <a href={`tel:${nearestUrgence.phone.replace(/\s/g, "")}`}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold text-center">
                {t("📞 Appeler urgences", "📞 Call emergency")}
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${nearestUrgence.lat},${nearestUrgence.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-white border border-red-300 text-red-600 text-xs font-semibold text-center">
                {t("🗺️ Y aller", "🗺️ Get directions")}
              </a>
            </div>
          </div>
        );
      })()}

      {/* Pays */}
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">{t("Pays", "Country")}</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {COUNTRIES.map(c => (
            <button key={c.code} onClick={() => setCountryFilter(c.code)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                countryFilter === c.code
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}>
              <span>{c.flag}</span>{c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recherche + Filtres */}
      <input className="input" placeholder={t("🔍 Rechercher un hôpital, clinique…", "🔍 Search a hospital, clinic…")}
        value={query} onChange={e => setQuery(e.target.value)} />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {STRUCTURE_TYPES.map(tp => (
          <button key={tp} onClick={() => setTypeFilter(tp)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              typeFilter === tp ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
            }`}>
            {tp !== "Tous" ? TYPE_ICONS[tp] : "🏥"} {tp}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={urgenceOnly} onChange={e => setUrgenceOnly(e.target.checked)} className="w-4 h-4 accent-red-500" />
          {t("Urgences seulement", "Emergencies only")}
        </label>
        {userPos && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={sortByDistance} onChange={e => setSortByDistance(e.target.checked)} className="w-4 h-4 accent-teal-500" />
            {t("Trier par distance", "Sort by distance")}
          </label>
        )}
      </div>

      <p className="text-xs text-gray-500">{filtered.length} {t("structure", "facility")}{filtered.length !== 1 ? "s" : ""} {t("trouvée", "found")}{lang === "fr" && filtered.length !== 1 ? "s" : ""}</p>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-10 space-y-3">
            <div className="text-5xl">🏥</div>
            <p className="font-semibold text-gray-800">{t("Aucune structure trouvée", "No facility found")}</p>
            <p className="text-sm text-gray-500 leading-relaxed px-4">
              {t("Essaie de changer de pays, de type de structure, ou d'effacer le filtre de recherche.", "Try changing the country, the facility type, or clearing the search filter.")}
            </p>
            <button onClick={() => { setQuery(""); setTypeFilter("Tous"); setUrgenceOnly(false); }}
              className="inline-block bg-teal-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
              {t("Réinitialiser les filtres", "Reset filters")}
            </button>
          </div>
        )}
        {filtered.map(s => (
          <StructureCard key={s.id} s={s} userPos={userPos} t={t} />
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center pt-2">
        {STRUCTURES.length} {t("structures", "facilities")} · 7 {t("pays", "countries")} · {t("Données indicatives — vérifiez les horaires sur place", "Indicative data — verify opening hours on site")}
      </p>
    </div>
  );
}
