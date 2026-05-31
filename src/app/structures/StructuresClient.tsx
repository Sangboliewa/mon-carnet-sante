"use client";
import { useState, useMemo } from "react";

interface Structure {
  name: string;
  type: "CHU" | "Clinique" | "Centre de santé" | "Pharmacie" | "Laboratoire";
  city: string;
  address: string;
  phone: string;
  urgence: boolean;
}

const STRUCTURES: Structure[] = [
  // CHU
  { name: "CHU de Cocody", type: "CHU", city: "Abidjan", address: "Bd de l'Université, Cocody", phone: "+225 27 22 48 28 20", urgence: true },
  { name: "CHU de Yopougon", type: "CHU", city: "Abidjan", address: "Quartier Yopougon", phone: "+225 27 23 45 66 00", urgence: true },
  { name: "CHU de Treichville", type: "CHU", city: "Abidjan", address: "Avenue Christiani, Treichville", phone: "+225 27 21 24 55 55", urgence: true },
  { name: "CHR de Bouaké", type: "CHU", city: "Bouaké", address: "Quartier Commerce, Bouaké", phone: "+225 27 31 63 23 00", urgence: true },
  { name: "CHR de Daloa", type: "CHU", city: "Daloa", address: "Centre-ville, Daloa", phone: "+225 27 32 78 10 00", urgence: true },
  { name: "CHR de San Pedro", type: "CHU", city: "San Pedro", address: "Secteur 3, San Pedro", phone: "+225 27 34 71 20 00", urgence: true },
  { name: "CHR de Korhogo", type: "CHU", city: "Korhogo", address: "Quartier Hôpital, Korhogo", phone: "+225 27 36 86 02 00", urgence: true },
  // Cliniques privées
  { name: "Clinique Avicenne", type: "Clinique", city: "Abidjan", address: "Deux Plateaux, Cocody", phone: "+225 27 22 41 52 52", urgence: true },
  { name: "Clinique Sainte Marie", type: "Clinique", city: "Abidjan", address: "Adjamé, Abidjan", phone: "+225 27 20 37 53 53", urgence: false },
  { name: "Polyclinique Internationale Sainte Anne Marie", type: "Clinique", city: "Abidjan", address: "Plateau, Abidjan", phone: "+225 27 20 31 49 90", urgence: true },
  { name: "Clinique du Plateau", type: "Clinique", city: "Abidjan", address: "Plateau, Abidjan", phone: "+225 27 20 21 12 12", urgence: false },
  { name: "Clinique Bonheur", type: "Clinique", city: "Abidjan", address: "Marcory, Abidjan", phone: "+225 27 21 35 48 48", urgence: false },
  // Centres de santé
  { name: "Centre de Santé Urbain d'Abobo", type: "Centre de santé", city: "Abidjan", address: "Abobo, Abidjan", phone: "+225 27 20 55 60 00", urgence: false },
  { name: "Centre de Santé Port-Bouët", type: "Centre de santé", city: "Abidjan", address: "Port-Bouët, Abidjan", phone: "+225 27 21 38 15 00", urgence: false },
  { name: "CSCOM Bouaké Sud", type: "Centre de santé", city: "Bouaké", address: "Quartier Sud, Bouaké", phone: "+225 27 31 63 10 00", urgence: false },
  // Laboratoires
  { name: "Laboratoire Pasteur CI", type: "Laboratoire", city: "Abidjan", address: "Plateau, Abidjan", phone: "+225 27 20 21 67 67", urgence: false },
  { name: "Laboratoire Biomédical Elitech", type: "Laboratoire", city: "Abidjan", address: "Cocody, Abidjan", phone: "+225 27 22 44 56 56", urgence: false },
  { name: "Labo Eurobio Abidjan", type: "Laboratoire", city: "Abidjan", address: "Marcory, Abidjan", phone: "+225 27 21 25 33 33", urgence: false },
  // Pharmacies
  { name: "Pharmacie Principale d'Abidjan", type: "Pharmacie", city: "Abidjan", address: "Plateau, Abidjan", phone: "+225 27 20 21 24 24", urgence: false },
  { name: "Pharmacie de Garde Cocody", type: "Pharmacie", city: "Abidjan", address: "Cocody, Abidjan", phone: "+225 27 22 44 11 11", urgence: true },
];

const TYPES = ["Tous", "CHU", "Clinique", "Centre de santé", "Laboratoire", "Pharmacie"] as const;
const CITIES = ["Toutes", ...new Set(STRUCTURES.map((s) => s.city))];

const TYPE_ICON: Record<string, string> = {
  CHU: "🏥", Clinique: "🏨", "Centre de santé": "🏠", Pharmacie: "💊", Laboratoire: "🔬",
};

export default function StructuresClient() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [cityFilter, setCityFilter] = useState("Toutes");
  const [urgenceOnly, setUrgenceOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return STRUCTURES.filter((s) => {
      if (typeFilter !== "Tous" && s.type !== typeFilter) return false;
      if (cityFilter !== "Toutes" && s.city !== cityFilter) return false;
      if (urgenceOnly && !s.urgence) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.city.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, typeFilter, cityFilter, urgenceOnly]);

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Recherche */}
      <input
        className="input-field"
        placeholder="🔍 Rechercher une structure…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${typeFilter === t ? "bg-health-blue text-white border-health-blue" : "bg-white text-gray-600 border-gray-200"}`}>
            {t !== "Tous" ? TYPE_ICON[t] : ""} {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <select className="input-field flex-1" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0 cursor-pointer">
          <input type="checkbox" checked={urgenceOnly} onChange={(e) => setUrgenceOnly(e.target.checked)} className="accent-health-blue w-4 h-4" />
          Urgences
        </label>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} structure{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}</p>

      {filtered.map((s, i) => (
        <div key={i} className="card space-y-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5">
                <span>{TYPE_ICON[s.type]}</span>
                <p className="font-semibold text-gray-900">{s.name}</p>
              </div>
              <p className="text-xs text-gray-500">{s.type} · {s.city}</p>
              <p className="text-xs text-gray-400">{s.address}</p>
            </div>
            {s.urgence && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0 ml-2">Urgences</span>
            )}
          </div>
          <a
            href={`tel:${s.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-health-blue font-medium text-sm mt-1"
          >
            📞 {s.phone}
          </a>
        </div>
      ))}
    </div>
  );
}
