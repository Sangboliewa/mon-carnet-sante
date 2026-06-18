"use client";
import { useState, useMemo, useEffect } from "react";
import { STRUCTURES, COUNTRIES, TYPE_ICONS, STRUCTURE_TYPES, haversine } from "@/lib/structures-data";
import type { HealthStructure } from "@/lib/structures-data";

interface GeoPos { lat: number; lng: number }

function DistanceBadge({ dist }: { dist: number }) {
  const color = dist < 2 ? "bg-green-100 text-green-700" : dist < 10 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}</span>;
}

function StructureCard({ s, userPos }: { s: HealthStructure; userPos: GeoPos | null }) {
  const dist = userPos ? haversine(userPos.lat, userPos.lng, s.lat, s.lng) : null;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base">{TYPE_ICONS[s.type]}</span>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{s.name}</p>
            {s.urgence && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">🚨 Urgences</span>
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
        {dist !== null && <DistanceBadge dist={dist} />}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-50">
        <a href={`tel:${s.phone.replace(/\s/g, "")}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium">
          📞 Appeler
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
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("CI");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [urgenceOnly, setUrgenceOnly] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [userPos, setUserPos] = useState<GeoPos | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function locateMe() {
    if (!navigator.geolocation) { setGeoError("Géolocalisation non supportée"); return; }
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
        setGeoError(err.code === 1 ? "Autorisation refusée" : "Impossible d'obtenir la position");
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
              {userPos ? "📍 Position détectée" : "📍 Me géolocaliser"}
            </p>
            <p className="text-xs text-teal-600 mt-0.5">
              {userPos
                ? `Tri par distance activé · ${filtered.length} structures`
                : "Trouver les structures les plus proches"}
            </p>
          </div>
          <button onClick={locateMe} disabled={geoLoading}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              userPos ? "bg-teal-600 text-white" : "bg-white border border-teal-400 text-teal-700"
            } disabled:opacity-50`}>
            {geoLoading ? "…" : userPos ? "✓ Localisé" : "Localiser"}
          </button>
        </div>
        {geoError && <p className="text-xs text-red-600 mt-1.5">{geoError}</p>}
      </div>

      {/* Urgence la plus proche */}
      {nearestUrgence && (() => {
        const dist = haversine(userPos!.lat, userPos!.lng, nearestUrgence.lat, nearestUrgence.lng);
        return (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1.5">🚨 Urgences les plus proches</p>
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
                📞 Appeler urgences
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${nearestUrgence.lat},${nearestUrgence.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-white border border-red-300 text-red-600 text-xs font-semibold text-center">
                🗺️ Y aller
              </a>
            </div>
          </div>
        );
      })()}

      {/* Pays */}
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Pays</p>
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
      <input className="input" placeholder="🔍 Rechercher un hôpital, clinique…"
        value={query} onChange={e => setQuery(e.target.value)} />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {STRUCTURE_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              typeFilter === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
            }`}>
            {t !== "Tous" ? TYPE_ICONS[t] : "🏥"} {t}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={urgenceOnly} onChange={e => setUrgenceOnly(e.target.checked)} className="w-4 h-4 accent-red-500" />
          Urgences seulement
        </label>
        {userPos && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={sortByDistance} onChange={e => setSortByDistance(e.target.checked)} className="w-4 h-4 accent-teal-500" />
            Trier par distance
          </label>
        )}
      </div>

      <p className="text-xs text-gray-500">{filtered.length} structure{filtered.length !== 1 ? "s" : ""} trouvée{filtered.length !== 1 ? "s" : ""}</p>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucune structure ne correspond à ces critères</p>
        )}
        {filtered.map(s => (
          <StructureCard key={s.id} s={s} userPos={userPos} />
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center pt-2">
        {STRUCTURES.length} structures · 7 pays · Données indicatives — vérifiez les horaires sur place
      </p>
    </div>
  );
}
