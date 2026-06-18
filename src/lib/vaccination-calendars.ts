// Calendriers vaccinaux nationaux — PEV Afrique de l'Ouest & Centrale
// Sources : OMS / UNICEF / Ministères de la Santé (2024)

export interface VaccineScheduleEntry {
  vaccine: string;
  fullName: string;
  ageLabel: string;         // "À la naissance", "6 semaines", etc.
  ageWeeks: number;         // age en semaines pour tri
  doses: number;
  category: "obligatoire" | "recommande" | "voyage";
  disease: string;
  notes?: string;
}

export interface CountryCalendar {
  code: string;
  name: string;
  flag: string;
  schedule: VaccineScheduleEntry[];
}

const BASE_PEV: VaccineScheduleEntry[] = [
  { vaccine: "BCG",       fullName: "Vaccin BCG",                       ageLabel: "À la naissance", ageWeeks: 0,  doses: 1, category: "obligatoire", disease: "Tuberculose" },
  { vaccine: "VPO0",      fullName: "Vaccin Polio oral (dose 0)",        ageLabel: "À la naissance", ageWeeks: 0,  doses: 1, category: "obligatoire", disease: "Poliomyélite" },
  { vaccine: "HepB0",     fullName: "Hépatite B (dose 0)",               ageLabel: "À la naissance", ageWeeks: 0,  doses: 1, category: "obligatoire", disease: "Hépatite B" },
  { vaccine: "Penta1",    fullName: "DTC-HepB-Hib (Pentavalent dose 1)", ageLabel: "6 semaines",     ageWeeks: 6,  doses: 3, category: "obligatoire", disease: "Diphtérie, Tétanos, Coqueluche, HepB, Hib" },
  { vaccine: "VPO1",      fullName: "Vaccin Polio oral dose 1",          ageLabel: "6 semaines",     ageWeeks: 6,  doses: 3, category: "obligatoire", disease: "Poliomyélite" },
  { vaccine: "Pneumo1",   fullName: "Pneumocoque (PCV13) dose 1",        ageLabel: "6 semaines",     ageWeeks: 6,  doses: 3, category: "obligatoire", disease: "Pneumonie" },
  { vaccine: "Rota1",     fullName: "Rotavirus dose 1",                  ageLabel: "6 semaines",     ageWeeks: 6,  doses: 2, category: "obligatoire", disease: "Gastro-entérite sévère" },
  { vaccine: "Penta2",    fullName: "DTC-HepB-Hib dose 2",               ageLabel: "10 semaines",    ageWeeks: 10, doses: 3, category: "obligatoire", disease: "Diphtérie, Tétanos, Coqueluche, HepB, Hib" },
  { vaccine: "VPO2",      fullName: "Vaccin Polio oral dose 2",          ageLabel: "10 semaines",    ageWeeks: 10, doses: 3, category: "obligatoire", disease: "Poliomyélite" },
  { vaccine: "Pneumo2",   fullName: "Pneumocoque dose 2",                ageLabel: "10 semaines",    ageWeeks: 10, doses: 3, category: "obligatoire", disease: "Pneumonie" },
  { vaccine: "Rota2",     fullName: "Rotavirus dose 2",                  ageLabel: "10 semaines",    ageWeeks: 10, doses: 2, category: "obligatoire", disease: "Gastro-entérite sévère" },
  { vaccine: "Penta3",    fullName: "DTC-HepB-Hib dose 3",               ageLabel: "14 semaines",    ageWeeks: 14, doses: 3, category: "obligatoire", disease: "Diphtérie, Tétanos, Coqueluche, HepB, Hib" },
  { vaccine: "VPO3",      fullName: "Vaccin Polio oral dose 3",          ageLabel: "14 semaines",    ageWeeks: 14, doses: 3, category: "obligatoire", disease: "Poliomyélite" },
  { vaccine: "VPI",       fullName: "Vaccin Polio inactivé",             ageLabel: "14 semaines",    ageWeeks: 14, doses: 1, category: "obligatoire", disease: "Poliomyélite" },
  { vaccine: "Pneumo3",   fullName: "Pneumocoque dose 3",                ageLabel: "14 semaines",    ageWeeks: 14, doses: 3, category: "obligatoire", disease: "Pneumonie" },
  { vaccine: "VAR",       fullName: "Vaccin Anti-Rougeoleux",            ageLabel: "9 mois",         ageWeeks: 39, doses: 2, category: "obligatoire", disease: "Rougeole" },
  { vaccine: "VAA",       fullName: "Vaccin Anti-Amaril (Fièvre jaune)", ageLabel: "9 mois",         ageWeeks: 39, doses: 1, category: "obligatoire", disease: "Fièvre jaune" },
  { vaccine: "VAR2",      fullName: "Vaccin Rougeole dose 2",            ageLabel: "15–18 mois",     ageWeeks: 65, doses: 2, category: "obligatoire", disease: "Rougeole" },
  { vaccine: "VAM",       fullName: "Vaccin Méningite A (MenAfriVac)",   ageLabel: "15–18 mois",     ageWeeks: 65, doses: 1, category: "obligatoire", disease: "Méningite à méningocoque A" },
  { vaccine: "DTC",       fullName: "Rappel Diphtérie-Tétanos-Coqueluche",ageLabel: "18 mois",       ageWeeks: 78, doses: 1, category: "obligatoire", disease: "Rappel DTC" },
];

const MALARIA: VaccineScheduleEntry = {
  vaccine: "RTS,S/R21",
  fullName: "Vaccin antipaludique (R21/Matrix-M)",
  ageLabel: "5 mois (série 3 doses)",
  ageWeeks: 22,
  doses: 4,
  category: "recommande",
  disease: "Paludisme",
  notes: "Déployé progressivement au Burkina Faso, Ghana, Kenya, Malawi, Sierra Leone (2024). Efficacité ~77%"
};

const HPV: VaccineScheduleEntry = {
  vaccine: "HPV",
  fullName: "Vaccin Papillomavirus humain",
  ageLabel: "9–14 ans (filles)",
  ageWeeks: 468,
  doses: 2,
  category: "recommande",
  disease: "Cancer du col de l'utérus",
  notes: "Programme national en cours d'extension dans la région"
};

const CHOLERA: VaccineScheduleEntry = {
  vaccine: "Choléra",
  fullName: "Vaccin oral Choléra (Shanchol)",
  ageLabel: "≥ 1 an",
  ageWeeks: 52,
  doses: 2,
  category: "recommande",
  disease: "Choléra",
  notes: "En zone épidémique ou lors de déplacements"
};

const TYPHOIDE: VaccineScheduleEntry = {
  vaccine: "TCV",
  fullName: "Vaccin conjugué Typhoïde",
  ageLabel: "9 mois – 2 ans",
  ageWeeks: 52,
  doses: 1,
  category: "recommande",
  disease: "Typhoïde",
};

const RAGE: VaccineScheduleEntry = {
  vaccine: "Rage",
  fullName: "Vaccin antirabique",
  ageLabel: "En cas d'exposition",
  ageWeeks: 0,
  doses: 4,
  category: "voyage",
  disease: "Rage",
};

export const COUNTRY_CALENDARS: CountryCalendar[] = [
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    schedule: [...BASE_PEV, MALARIA, HPV, TYPHOIDE, CHOLERA],
  },
  {
    code: "SN",
    name: "Sénégal",
    flag: "🇸🇳",
    schedule: [...BASE_PEV, MALARIA, HPV, TYPHOIDE],
  },
  {
    code: "ML",
    name: "Mali",
    flag: "🇲🇱",
    schedule: [...BASE_PEV, MALARIA, TYPHOIDE],
  },
  {
    code: "BF",
    name: "Burkina Faso",
    flag: "🇧🇫",
    schedule: [...BASE_PEV, { ...MALARIA, notes: "Programme pilote RTS,S actif depuis 2023. L'un des premiers pays de déploiement." }, HPV, TYPHOIDE],
  },
  {
    code: "GN",
    name: "Guinée",
    flag: "🇬🇳",
    schedule: [...BASE_PEV, TYPHOIDE, CHOLERA],
  },
  {
    code: "TG",
    name: "Togo",
    flag: "🇹🇬",
    schedule: [...BASE_PEV, MALARIA, HPV, TYPHOIDE],
  },
  {
    code: "BJ",
    name: "Bénin",
    flag: "🇧🇯",
    schedule: [...BASE_PEV, MALARIA, HPV, TYPHOIDE],
  },
  {
    code: "CM",
    name: "Cameroun",
    flag: "🇨🇲",
    schedule: [...BASE_PEV, MALARIA, HPV, TYPHOIDE, CHOLERA],
  },
  {
    code: "NG",
    name: "Niger",
    flag: "🇳🇪",
    schedule: [...BASE_PEV, TYPHOIDE],
  },
  {
    code: "MR",
    name: "Mauritanie",
    flag: "🇲🇷",
    schedule: [...BASE_PEV, TYPHOIDE],
  },
  {
    code: "GA",
    name: "Gabon",
    flag: "🇬🇦",
    schedule: [...BASE_PEV, HPV, TYPHOIDE, RAGE],
  },
  {
    code: "CD",
    name: "RD Congo",
    flag: "🇨🇩",
    schedule: [...BASE_PEV, MALARIA, CHOLERA, TYPHOIDE],
  },
];

// Trouve les vaccins non encore reçus selon l'âge de la personne
export function getMissingVaccines(
  calendar: CountryCalendar,
  receivedNames: string[],
  ageMonths: number,
): VaccineScheduleEntry[] {
  const receivedLower = receivedNames.map(n => n.toLowerCase());
  const ageWeeks = ageMonths * 4.33;
  return calendar.schedule.filter(entry => {
    const isDue = entry.ageWeeks <= ageWeeks;
    const isReceived = receivedLower.some(r =>
      r.includes(entry.vaccine.toLowerCase()) || r.includes(entry.fullName.toLowerCase().split(" ")[1])
    );
    return isDue && !isReceived;
  });
}
