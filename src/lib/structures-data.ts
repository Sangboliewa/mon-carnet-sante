// Structures de santé — Afrique de l'Ouest & Centrale
// Coordonnées GPS approximatives (centre des quartiers)

export interface HealthStructure {
  id: string;
  name: string;
  type: "CHU" | "Clinique" | "Centre de santé" | "Pharmacie" | "Laboratoire" | "Maternité";
  country: string;
  countryCode: string;
  city: string;
  address: string;
  phone: string;
  urgence: boolean;
  lat: number;
  lng: number;
  specialties?: string[];
  opening_hours?: string;
}

export const STRUCTURES: HealthStructure[] = [
  // ─── CÔTE D'IVOIRE ─────────────────────────────────────────────────────────
  { id: "ci-1",  name: "CHU de Cocody",                              type: "CHU",            country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Bd de l'Université, Cocody",          phone: "+225 27 22 48 28 20", urgence: true,  lat: 5.3523,  lng: -4.0107, specialties: ["Cardiologie","Neurologie","Pédiatrie","Chirurgie"] },
  { id: "ci-2",  name: "CHU de Yopougon",                            type: "CHU",            country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Quartier Yopougon",                   phone: "+225 27 23 45 66 00", urgence: true,  lat: 5.3167,  lng: -4.0833, specialties: ["Médecine interne","Gynécologie","Oncologie"] },
  { id: "ci-3",  name: "CHU de Treichville",                         type: "CHU",            country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Avenue Christiani, Treichville",       phone: "+225 27 21 24 55 55", urgence: true,  lat: 5.2947,  lng: -4.0082, specialties: ["Maladies infectieuses","Dermatologie","Ophtalmologie"] },
  { id: "ci-4",  name: "CHR de Bouaké",                              type: "CHU",            country: "Côte d'Ivoire", countryCode: "CI", city: "Bouaké",   address: "Quartier Commerce",                   phone: "+225 27 31 63 23 00", urgence: true,  lat: 7.6906,  lng: -5.0388, specialties: ["Médecine générale","Pédiatrie","Chirurgie"] },
  { id: "ci-5",  name: "CHR de Korhogo",                             type: "CHU",            country: "Côte d'Ivoire", countryCode: "CI", city: "Korhogo",  address: "Quartier Hôpital",                    phone: "+225 27 36 86 02 00", urgence: true,  lat: 9.4579,  lng: -5.6310 },
  { id: "ci-6",  name: "CHR de Daloa",                               type: "CHU",            country: "Côte d'Ivoire", countryCode: "CI", city: "Daloa",    address: "Centre-ville",                        phone: "+225 27 32 78 10 00", urgence: true,  lat: 6.8899,  lng: -6.4500 },
  { id: "ci-7",  name: "Clinique Avicenne",                          type: "Clinique",       country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Deux Plateaux, Cocody",               phone: "+225 27 22 41 52 52", urgence: true,  lat: 5.3716,  lng: -3.9969 },
  { id: "ci-8",  name: "Polyclinique Ste Anne Marie (PISAM)",        type: "Clinique",       country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Plateau, Abidjan",                    phone: "+225 27 20 31 49 90", urgence: true,  lat: 5.3197,  lng: -4.0186 },
  { id: "ci-9",  name: "Clinique du Plateau",                        type: "Clinique",       country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Plateau, Abidjan",                    phone: "+225 27 20 21 12 12", urgence: false, lat: 5.3206,  lng: -4.0151 },
  { id: "ci-10", name: "Laboratoire Pasteur CI",                     type: "Laboratoire",    country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Plateau, Abidjan",                    phone: "+225 27 20 21 67 67", urgence: false, lat: 5.3200,  lng: -4.0160 },
  { id: "ci-11", name: "Pharmacie Principale d'Abidjan",             type: "Pharmacie",      country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Plateau, Abidjan",                    phone: "+225 27 20 21 24 24", urgence: false, lat: 5.3202,  lng: -4.0175, opening_hours: "Lun–Sam 7h–21h" },
  { id: "ci-12", name: "Pharmacie de Garde Cocody",                  type: "Pharmacie",      country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Cocody, Abidjan",                     phone: "+225 27 22 44 11 11", urgence: true,  lat: 5.3730,  lng: -3.9950, opening_hours: "24h/24" },
  { id: "ci-13", name: "Maternité de Port-Bouët",                    type: "Maternité",      country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Port-Bouët, Abidjan",                 phone: "+225 27 21 38 15 00", urgence: false, lat: 5.2544,  lng: -3.9284 },
  { id: "ci-14", name: "Centre de Santé Urbain d'Abobo",             type: "Centre de santé",country: "Côte d'Ivoire", countryCode: "CI", city: "Abidjan",  address: "Abobo, Abidjan",                      phone: "+225 27 20 55 60 00", urgence: false, lat: 5.4150,  lng: -4.0367 },

  // ─── SÉNÉGAL ───────────────────────────────────────────────────────────────
  { id: "sn-1",  name: "Hôpital Aristide Le Dantec",                 type: "CHU",            country: "Sénégal",       countryCode: "SN", city: "Dakar",    address: "Avenue Pasteur, Dakar",               phone: "+221 33 839 50 00", urgence: true,  lat: 14.6727, lng: -17.4330, specialties: ["Cardiologie","Rhumatologie","Médecine interne"] },
  { id: "sn-2",  name: "Hôpital Principal de Dakar",                 type: "CHU",            country: "Sénégal",       countryCode: "SN", city: "Dakar",    address: "Avenue Nelson Mandela",               phone: "+221 33 839 50 50", urgence: true,  lat: 14.6761, lng: -17.4349 },
  { id: "sn-3",  name: "Hôpital Fann (CHU)",                         type: "CHU",            country: "Sénégal",       countryCode: "SN", city: "Dakar",    address: "Avenue Cheikh Anta Diop",             phone: "+221 33 869 18 18", urgence: true,  lat: 14.6929, lng: -17.4686, specialties: ["Neurologie","Psychiatrie","Maladies infectieuses"] },
  { id: "sn-4",  name: "Clinique Pasteur",                           type: "Clinique",       country: "Sénégal",       countryCode: "SN", city: "Dakar",    address: "Almadies, Dakar",                     phone: "+221 33 859 16 16", urgence: true,  lat: 14.7455, lng: -17.5123 },
  { id: "sn-5",  name: "Hôpital Régional de Thiès",                  type: "CHU",            country: "Sénégal",       countryCode: "SN", city: "Thiès",    address: "Quartier Médina Fall",                phone: "+221 33 951 12 50", urgence: true,  lat: 14.7880, lng: -16.9261 },
  { id: "sn-6",  name: "Hôpital Régional de Saint-Louis",            type: "CHU",            country: "Sénégal",       countryCode: "SN", city: "Saint-Louis", address: "Route de Sor",                    phone: "+221 33 961 13 65", urgence: true,  lat: 16.0271, lng: -16.4922 },

  // ─── MALI ──────────────────────────────────────────────────────────────────
  { id: "ml-1",  name: "CHU Gabriel Touré",                          type: "CHU",            country: "Mali",          countryCode: "ML", city: "Bamako",   address: "Rue Fily Dabo Sissoko, Bamako",       phone: "+223 20 22 27 16", urgence: true,  lat: 12.6500, lng: -8.0000, specialties: ["Chirurgie","Pédiatrie","Gynécologie","Médecine interne"] },
  { id: "ml-2",  name: "CHU du Point G",                             type: "CHU",            country: "Mali",          countryCode: "ML", city: "Bamako",   address: "Colline du Point G",                  phone: "+223 20 22 50 02", urgence: true,  lat: 12.6728, lng: -8.0005, specialties: ["Oncologie","Cardiologie","Neurologie"] },
  { id: "ml-3",  name: "Clinique Pasteur Bamako",                    type: "Clinique",       country: "Mali",          countryCode: "ML", city: "Bamako",   address: "Boulkassoumbougou, Bamako",           phone: "+223 44 90 40 60", urgence: true,  lat: 12.6620, lng: -8.0112 },
  { id: "ml-4",  name: "Hôpital Régional de Mopti",                  type: "CHU",            country: "Mali",          countryCode: "ML", city: "Mopti",    address: "Centre-ville, Mopti",                 phone: "+223 21 43 00 06", urgence: true,  lat: 14.4940, lng: -4.1920 },

  // ─── BURKINA FASO ──────────────────────────────────────────────────────────
  { id: "bf-1",  name: "CHU Yalgado Ouédraogo",                      type: "CHU",            country: "Burkina Faso",  countryCode: "BF", city: "Ouagadougou", address: "Av. du Professeur Joseph Ki-Zerbo", phone: "+226 25 31 45 25", urgence: true,  lat: 12.3716, lng: -1.5275, specialties: ["Chirurgie","Cardiologie","Pédiatrie"] },
  { id: "bf-2",  name: "CHU Souro Sanou",                            type: "CHU",            country: "Burkina Faso",  countryCode: "BF", city: "Bobo-Dioulasso", address: "Ave Jean Paul II, Bobo-Dioulasso", phone: "+226 20 97 00 45", urgence: true,  lat: 11.1771, lng: -4.2979 },
  { id: "bf-3",  name: "Clinique Sandof",                            type: "Clinique",       country: "Burkina Faso",  countryCode: "BF", city: "Ouagadougou", address: "Secteur 30, Ouagadougou",           phone: "+226 25 36 36 00", urgence: true,  lat: 12.3601, lng: -1.5219 },
  { id: "bf-4",  name: "Centre Médical de Koudougou",                type: "Centre de santé",country: "Burkina Faso",  countryCode: "BF", city: "Koudougou", address: "Quartier central, Koudougou",        phone: "+226 25 44 00 28", urgence: false, lat: 12.2500, lng: -2.3667 },

  // ─── GUINÉE ────────────────────────────────────────────────────────────────
  { id: "gn-1",  name: "CHU Donka",                                  type: "CHU",            country: "Guinée",        countryCode: "GN", city: "Conakry",  address: "Commune de Dixinn, Conakry",          phone: "+224 621 35 35 00", urgence: true,  lat: 9.5456,  lng: -13.6773, specialties: ["Médecine générale","Chirurgie","Pédiatrie"] },
  { id: "gn-2",  name: "Hôpital National Ignace Deen",               type: "CHU",            country: "Guinée",        countryCode: "GN", city: "Conakry",  address: "Kaloum, Conakry",                     phone: "+224 664 60 21 00", urgence: true,  lat: 9.5254,  lng: -13.7089 },
  { id: "gn-3",  name: "Clinique Ambroise Paré",                     type: "Clinique",       country: "Guinée",        countryCode: "GN", city: "Conakry",  address: "Ratoma, Conakry",                     phone: "+224 622 25 25 25", urgence: false, lat: 9.5800,  lng: -13.6700 },

  // ─── CAMEROUN ──────────────────────────────────────────────────────────────
  { id: "cm-1",  name: "CHU de Yaoundé",                             type: "CHU",            country: "Cameroun",      countryCode: "CM", city: "Yaoundé",  address: "Rue Joseph Mballa Eloumden",          phone: "+237 222 23 56 56", urgence: true,  lat: 3.8634,  lng: 11.5167, specialties: ["Cardiologie","Neurochirurgie","Oncologie"] },
  { id: "cm-2",  name: "Hôpital Central de Yaoundé",                 type: "CHU",            country: "Cameroun",      countryCode: "CM", city: "Yaoundé",  address: "Rue Henri Dunant",                    phone: "+237 222 23 40 00", urgence: true,  lat: 3.8680,  lng: 11.5214 },
  { id: "cm-3",  name: "CHU de Douala",                              type: "CHU",            country: "Cameroun",      countryCode: "CM", city: "Douala",   address: "Boulevard de la Liberté, Douala",     phone: "+237 233 42 71 71", urgence: true,  lat: 4.0511,  lng: 9.7679, specialties: ["Chirurgie","Pédiatrie","Gynécologie"] },
  { id: "cm-4",  name: "Polyclinique Bonanjo",                       type: "Clinique",       country: "Cameroun",      countryCode: "CM", city: "Douala",   address: "Bonanjo, Douala",                     phone: "+237 233 43 20 90", urgence: true,  lat: 4.0570,  lng: 9.7135 },

  // ─── TOGO ──────────────────────────────────────────────────────────────────
  { id: "tg-1",  name: "CHU Sylvanus Olympio",                       type: "CHU",            country: "Togo",          countryCode: "TG", city: "Lomé",     address: "Bd 13 janvier, Lomé",                 phone: "+228 22 21 25 01", urgence: true,  lat: 6.1375,  lng: 1.2123, specialties: ["Médecine interne","Pédiatrie","Chirurgie"] },
  { id: "tg-2",  name: "Clinique de l'Alliance",                     type: "Clinique",       country: "Togo",          countryCode: "TG", city: "Lomé",     address: "Quartier Adidogomé, Lomé",            phone: "+228 22 61 12 12", urgence: true,  lat: 6.1620,  lng: 1.2010 },
  { id: "tg-3",  name: "Hôpital de Kara",                            type: "CHU",            country: "Togo",          countryCode: "TG", city: "Kara",     address: "Quartier hôpital, Kara",              phone: "+228 22 60 60 45", urgence: true,  lat: 9.5512,  lng: 1.1861 },
];

export const COUNTRIES = [
  { code: "ALL", name: "Tous les pays",   flag: "🌍" },
  { code: "CI",  name: "Côte d'Ivoire",  flag: "🇨🇮" },
  { code: "SN",  name: "Sénégal",        flag: "🇸🇳" },
  { code: "ML",  name: "Mali",           flag: "🇲🇱" },
  { code: "BF",  name: "Burkina Faso",   flag: "🇧🇫" },
  { code: "GN",  name: "Guinée",         flag: "🇬🇳" },
  { code: "CM",  name: "Cameroun",       flag: "🇨🇲" },
  { code: "TG",  name: "Togo",           flag: "🇹🇬" },
];

export const TYPE_ICONS: Record<string, string> = {
  CHU: "🏥", Clinique: "🏨", "Centre de santé": "🏠", Pharmacie: "💊", Laboratoire: "🔬", Maternité: "🤱",
};

export const STRUCTURE_TYPES = ["Tous", "CHU", "Clinique", "Centre de santé", "Pharmacie", "Laboratoire", "Maternité"] as const;

// Distance en km entre deux coordonnées GPS (formule Haversine)
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
