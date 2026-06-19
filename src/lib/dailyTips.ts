export interface HealthTip {
  id: number;
  category: "nutrition" | "hydration" | "exercise" | "sleep" | "prevention" | "mental" | "hygiene" | "heart";
  categoryLabel: string;
  icon: string;
  color: string;
  title: string;
  body: string;
}

export const DAILY_TIPS: HealthTip[] = [
  { id: 1, category: "hydration", categoryLabel: "Hydratation", icon: "💧", color: "blue", title: "Bois 8 verres d'eau par jour", body: "Une bonne hydratation maintient ta pression artérielle stable, améliore la concentration et protège tes reins. En saison chaude, augmente à 10-12 verres." },
  { id: 2, category: "nutrition", categoryLabel: "Nutrition", icon: "🥗", color: "green", title: "Mange 5 fruits et légumes par jour", body: "Les fruits et légumes apportent des vitamines, minéraux et antioxydants essentiels. Varie les couleurs pour couvrir tous les besoins nutritionnels." },
  { id: 3, category: "sleep", categoryLabel: "Sommeil", icon: "😴", color: "indigo", title: "Dors 7 à 8 heures chaque nuit", body: "Un sommeil suffisant renforce le système immunitaire, régule les hormones et améliore la mémoire. Couche-toi à heures fixes même le week-end." },
  { id: 4, category: "exercise", categoryLabel: "Activité physique", icon: "🚶", color: "orange", title: "30 minutes de marche par jour", body: "La marche quotidienne réduit le risque de diabète, d'hypertension et de maladies cardiaques. Commence par 10 minutes et augmente progressivement." },
  { id: 5, category: "prevention", categoryLabel: "Prévention", icon: "🦟", color: "amber", title: "Protège-toi du paludisme", body: "Dors sous une moustiquaire imprégnée, élimine les eaux stagnantes autour de chez toi et consulte rapidement en cas de fièvre après une piqûre." },
  { id: 6, category: "hygiene", categoryLabel: "Hygiène", icon: "🧼", color: "teal", title: "Lave-toi les mains régulièrement", body: "Le lavage des mains avec du savon pendant 20 secondes élimine 99% des bactéries et virus. C'est le geste barrière le plus efficace qui soit." },
  { id: 7, category: "heart", categoryLabel: "Cœur", icon: "❤️", color: "red", title: "Surveille ta tension artérielle", body: "L'hypertension est silencieuse mais dangereuse. Mesure ta tension régulièrement, réduisez le sel et évitez le stress prolongé pour protéger ton cœur." },
  { id: 8, category: "nutrition", categoryLabel: "Nutrition", icon: "🐟", color: "green", title: "Consomme des poissons 2 fois par semaine", body: "Le poisson est riche en oméga-3 qui protègent le cœur et le cerveau. Préfère les poissons locaux comme le maquereau, la sardine ou le tilapia." },
  { id: 9, category: "mental", categoryLabel: "Santé mentale", icon: "🧘", color: "purple", title: "Prends 5 minutes pour respirer", body: "La respiration profonde active le système parasympathique et réduit le cortisol. Inspire 4 secondes, retiens 4 secondes, expire 6 secondes." },
  { id: 10, category: "prevention", categoryLabel: "Prévention", icon: "💉", color: "amber", title: "Garde tes vaccinations à jour", body: "Les vaccins protègent non seulement toi, mais aussi ta famille et ta communauté. Vérifie ton carnet vaccinal et consulte ton médecin pour les rappels." },
  { id: 11, category: "hydration", categoryLabel: "Hydratation", icon: "🍵", color: "blue", title: "Réduis le café et les sodas", body: "Le café en excès augmente la tension artérielle. Les sodas contiennent l'équivalent de 10 sucres par canette. Remplace par de l'eau ou des infusions." },
  { id: 12, category: "exercise", categoryLabel: "Activité physique", icon: "🏃", color: "orange", title: "Bouge toutes les heures", body: "Rester assis plus de 8h augmente le risque cardiovasculaire. Lève-toi, étire-toi et marche 5 minutes toutes les heures, même au bureau." },
  { id: 13, category: "sleep", categoryLabel: "Sommeil", icon: "📵", color: "indigo", title: "Évite les écrans avant de dormir", body: "La lumière bleue des téléphones bloque la mélatonine et perturbe l'endormissement. Pose ton téléphone 30 minutes avant de dormir." },
  { id: 14, category: "nutrition", categoryLabel: "Nutrition", icon: "🌾", color: "green", title: "Préfère les céréales complètes", body: "Le riz complet, l'attiéké et le mil libèrent leur énergie lentement, stabilisant la glycémie. Excellents pour prévenir le diabète de type 2." },
  { id: 15, category: "prevention", categoryLabel: "Prévention", icon: "☀️", color: "amber", title: "Protège-toi du soleil", body: "Même en Afrique, les UV endommagent la peau et les yeux. Porte un chapeau, des lunettes de soleil et évite le soleil entre 12h et 15h." },
  { id: 16, category: "heart", categoryLabel: "Cœur", icon: "🚭", color: "red", title: "Le tabac touche aussi les non-fumeurs", body: "La fumée passive cause autant de dommages cardiovasculaires que le tabagisme actif. Protège ta famille en fumant à l'extérieur ou en arrêtant." },
  { id: 17, category: "hygiene", categoryLabel: "Hygiène", icon: "🦷", color: "teal", title: "Brosse-toi les dents 2 fois par jour", body: "Les maladies dentaires sont liées aux maladies cardiaques et au diabète. Brosse 2 minutes matin et soir et consulte un dentiste chaque année." },
  { id: 18, category: "mental", categoryLabel: "Santé mentale", icon: "🤝", color: "purple", title: "Le lien social protège la santé", body: "L'isolement social augmente les risques de dépression et de démence. Prends le temps d'appeler un proche, de te retrouver avec ta communauté." },
  { id: 19, category: "nutrition", categoryLabel: "Nutrition", icon: "🫘", color: "green", title: "Les légumineuses, tes alliées", body: "Haricots, lentilles, pois chiches sont riches en protéines végétales, fibres et fer. Parfaits pour les diabétiques et pour réduire le cholestérol." },
  { id: 20, category: "prevention", categoryLabel: "Prévention", icon: "🩺", color: "amber", title: "Consultation médicale annuelle", body: "Même en bonne santé, un bilan annuel permet de détecter tôt le diabète, l'hypertension, les anémies. La prévention est toujours moins coûteuse que le traitement." },
  { id: 21, category: "exercise", categoryLabel: "Activité physique", icon: "🚴", color: "orange", title: "Le vélo protège le cœur", body: "30 minutes de vélo par jour réduit le risque cardiovasculaire de 50%. C'est aussi bon pour les articulations que la course à pied en moins traumatisant." },
  { id: 22, category: "sleep", categoryLabel: "Sommeil", icon: "🌙", color: "indigo", title: "Crée un rituel du coucher", body: "Un rituel régulier (tisane, lecture, étirements) signale au cerveau qu'il est l'heure de dormir. Tu t'endormiras 2x plus vite en 2 semaines." },
  { id: 23, category: "heart", categoryLabel: "Cœur", icon: "🧂", color: "red", title: "Réduis le sel dans tes plats", body: "L'excès de sel est la première cause d'hypertension en Afrique de l'Ouest. Utilise des épices naturelles (gingembre, ail, citron) pour assaisonner." },
  { id: 24, category: "hydration", categoryLabel: "Hydratation", icon: "🌿", color: "blue", title: "Les tisanes, une bonne alternative", body: "La citronnelle, le gingembre, la menthe et le moringa sont d'excellentes tisanes. Riches en antioxydants, elles hydratent et ont des propriétés médicinales." },
  { id: 25, category: "mental", categoryLabel: "Santé mentale", icon: "🎵", color: "purple", title: "La musique soigne vraiment", body: "Écouter de la musique agréable réduit le cortisol, abaisse la tension artérielle et libère de la dopamine. 20 minutes par jour ont un effet mesurable." },
  { id: 26, category: "prevention", categoryLabel: "Prévention", icon: "🔬", color: "amber", title: "Dépistage de la drépanocytose", body: "En Afrique de l'Ouest, 1 personne sur 4 est porteuse du trait drépanocytaire. Un simple test sanguin suffit pour connaître ton statut et protéger tes enfants." },
  { id: 27, category: "nutrition", categoryLabel: "Nutrition", icon: "🥜", color: "green", title: "Les noix, un snack santé", body: "Une poignée d'arachides ou de noix de cajou par jour apporte des bons acides gras, de la vitamine E et du magnésium. Meilleur que les gâteaux industriels." },
  { id: 28, category: "exercise", categoryLabel: "Activité physique", icon: "💃", color: "orange", title: "La danse, c'est du sport !", body: "30 minutes de danse brûlent autant de calories que le jogging, en plus de stimuler la coordination, la mémoire et l'humeur. Amuse-toi en te dépensant." },
  { id: 29, category: "hygiene", categoryLabel: "Hygiène", icon: "🥃", color: "teal", title: "Eau propre, vie saine", body: "L'eau non purifiée est source de choléra, typhoïde, hépatite A. Fais bouillir l'eau ou utilise un filtre certifié. L'investissement le plus important pour ta famille." },
  { id: 30, category: "mental", categoryLabel: "Santé mentale", icon: "🙏", color: "purple", title: "La gratitude améliore la santé", body: "Écrire 3 choses positives chaque soir avant de dormir réduit l'anxiété, améliore le sommeil et renforce l'immunité. Essaie pendant 7 jours." },
];

export function getTodaysTip(): HealthTip {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}

export const TIP_COLORS: Record<string, { bg: string; border: string; tag: string; text: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   tag: "bg-blue-100 text-blue-700",   text: "text-blue-900" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  tag: "bg-green-100 text-green-700",  text: "text-green-900" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", tag: "bg-indigo-100 text-indigo-700", text: "text-indigo-900" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", tag: "bg-orange-100 text-orange-700", text: "text-orange-900" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-200",  tag: "bg-amber-100 text-amber-700",  text: "text-amber-900" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-200",   tag: "bg-teal-100 text-teal-700",   text: "text-teal-900" },
  red:    { bg: "bg-red-50",    border: "border-red-200",    tag: "bg-red-100 text-red-700",     text: "text-red-900" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", tag: "bg-purple-100 text-purple-700", text: "text-purple-900" },
};
