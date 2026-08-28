export interface HealthTip {
  id: number;
  category: "nutrition" | "hydration" | "exercise" | "sleep" | "prevention" | "mental" | "hygiene" | "heart";
  categoryLabel: string;
  categoryLabelEn: string;
  icon: string;
  color: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
}

export const DAILY_TIPS: HealthTip[] = [
  { id: 1, category: "hydration", categoryLabel: "Hydratation", categoryLabelEn: "Hydration", icon: "💧", color: "blue",
    title: "Bois 8 verres d'eau par jour", titleEn: "Drink 8 glasses of water a day",
    body: "Une bonne hydratation maintient ta pression artérielle stable, améliore la concentration et protège tes reins. En saison chaude, augmente à 10-12 verres.",
    bodyEn: "Good hydration keeps your blood pressure stable, improves concentration, and protects your kidneys. In hot weather, increase to 10-12 glasses." },

  { id: 2, category: "nutrition", categoryLabel: "Nutrition", categoryLabelEn: "Nutrition", icon: "🥗", color: "green",
    title: "Mange 5 fruits et légumes par jour", titleEn: "Eat 5 fruits and vegetables a day",
    body: "Les fruits et légumes apportent des vitamines, minéraux et antioxydants essentiels. Varie les couleurs pour couvrir tous les besoins nutritionnels.",
    bodyEn: "Fruits and vegetables provide essential vitamins, minerals, and antioxidants. Vary the colours to cover all nutritional needs." },

  { id: 3, category: "sleep", categoryLabel: "Sommeil", categoryLabelEn: "Sleep", icon: "😴", color: "indigo",
    title: "Dors 7 à 8 heures chaque nuit", titleEn: "Sleep 7 to 8 hours every night",
    body: "Un sommeil suffisant renforce le système immunitaire, régule les hormones et améliore la mémoire. Couche-toi à heures fixes même le week-end.",
    bodyEn: "Adequate sleep strengthens your immune system, regulates hormones, and improves memory. Go to bed at fixed times, even on weekends." },

  { id: 4, category: "exercise", categoryLabel: "Activité physique", categoryLabelEn: "Physical activity", icon: "🚶", color: "orange",
    title: "30 minutes de marche par jour", titleEn: "30 minutes of walking per day",
    body: "La marche quotidienne réduit le risque de diabète, d'hypertension et de maladies cardiaques. Commence par 10 minutes et augmente progressivement.",
    bodyEn: "Daily walking reduces the risk of diabetes, high blood pressure, and heart disease. Start with 10 minutes and gradually increase." },

  { id: 5, category: "prevention", categoryLabel: "Prévention", categoryLabelEn: "Prevention", icon: "🦟", color: "amber",
    title: "Protège-toi du paludisme", titleEn: "Protect yourself from malaria",
    body: "Dors sous une moustiquaire imprégnée, élimine les eaux stagnantes autour de chez toi et consulte rapidement en cas de fièvre après une piqûre.",
    bodyEn: "Sleep under a treated mosquito net, eliminate stagnant water around your home, and seek medical advice promptly if you develop fever after a bite." },

  { id: 6, category: "hygiene", categoryLabel: "Hygiène", categoryLabelEn: "Hygiene", icon: "🧼", color: "teal",
    title: "Lave-toi les mains régulièrement", titleEn: "Wash your hands regularly",
    body: "Le lavage des mains avec du savon pendant 20 secondes élimine 99% des bactéries et virus. C'est le geste barrière le plus efficace qui soit.",
    bodyEn: "Washing hands with soap for 20 seconds eliminates 99% of bacteria and viruses. It is the most effective preventive measure there is." },

  { id: 7, category: "heart", categoryLabel: "Cœur", categoryLabelEn: "Heart", icon: "❤️", color: "red",
    title: "Surveille ta tension artérielle", titleEn: "Monitor your blood pressure",
    body: "L'hypertension est silencieuse mais dangereuse. Mesure ta tension régulièrement, réduisez le sel et évitez le stress prolongé pour protéger ton cœur.",
    bodyEn: "High blood pressure is silent but dangerous. Check your blood pressure regularly, reduce salt intake, and avoid prolonged stress to protect your heart." },

  { id: 8, category: "nutrition", categoryLabel: "Nutrition", categoryLabelEn: "Nutrition", icon: "🐟", color: "green",
    title: "Consomme des poissons 2 fois par semaine", titleEn: "Eat fish twice a week",
    body: "Le poisson est riche en oméga-3 qui protègent le cœur et le cerveau. Préfère les poissons locaux comme le maquereau, la sardine ou le tilapia.",
    bodyEn: "Fish is rich in omega-3 fatty acids that protect the heart and brain. Choose local fish such as mackerel, sardine, or tilapia." },

  { id: 9, category: "mental", categoryLabel: "Santé mentale", categoryLabelEn: "Mental health", icon: "🧘", color: "purple",
    title: "Prends 5 minutes pour respirer", titleEn: "Take 5 minutes to breathe",
    body: "La respiration profonde active le système parasympathique et réduit le cortisol. Inspire 4 secondes, retiens 4 secondes, expire 6 secondes.",
    bodyEn: "Deep breathing activates the parasympathetic system and reduces cortisol. Inhale for 4 seconds, hold for 4 seconds, exhale for 6 seconds." },

  { id: 10, category: "prevention", categoryLabel: "Prévention", categoryLabelEn: "Prevention", icon: "💉", color: "amber",
    title: "Garde tes vaccinations à jour", titleEn: "Keep your vaccinations up to date",
    body: "Les vaccins protègent non seulement toi, mais aussi ta famille et ta communauté. Vérifie ton carnet vaccinal et consulte ton médecin pour les rappels.",
    bodyEn: "Vaccines protect not only you but also your family and community. Check your vaccination record and consult your doctor about boosters." },

  { id: 11, category: "hydration", categoryLabel: "Hydratation", categoryLabelEn: "Hydration", icon: "🍵", color: "blue",
    title: "Réduis le café et les sodas", titleEn: "Cut back on coffee and sodas",
    body: "Le café en excès augmente la tension artérielle. Les sodas contiennent l'équivalent de 10 sucres par canette. Remplace par de l'eau ou des infusions.",
    bodyEn: "Excess coffee raises blood pressure. Sodas contain the equivalent of 10 sugar cubes per can. Replace them with water or herbal teas." },

  { id: 12, category: "exercise", categoryLabel: "Activité physique", categoryLabelEn: "Physical activity", icon: "🏃", color: "orange",
    title: "Bouge toutes les heures", titleEn: "Move every hour",
    body: "Rester assis plus de 8h augmente le risque cardiovasculaire. Lève-toi, étire-toi et marche 5 minutes toutes les heures, même au bureau.",
    bodyEn: "Sitting for more than 8 hours increases cardiovascular risk. Stand up, stretch, and walk 5 minutes every hour, even at the office." },

  { id: 13, category: "sleep", categoryLabel: "Sommeil", categoryLabelEn: "Sleep", icon: "📵", color: "indigo",
    title: "Évite les écrans avant de dormir", titleEn: "Avoid screens before bed",
    body: "La lumière bleue des téléphones bloque la mélatonine et perturbe l'endormissement. Pose ton téléphone 30 minutes avant de dormir.",
    bodyEn: "Blue light from phones blocks melatonin and disrupts sleep onset. Put your phone down 30 minutes before sleeping." },

  { id: 14, category: "nutrition", categoryLabel: "Nutrition", categoryLabelEn: "Nutrition", icon: "🌾", color: "green",
    title: "Préfère les céréales complètes", titleEn: "Choose whole grains",
    body: "Le riz complet, l'attiéké et le mil libèrent leur énergie lentement, stabilisant la glycémie. Excellents pour prévenir le diabète de type 2.",
    bodyEn: "Brown rice, attiéké, and millet release energy slowly, stabilising blood sugar. Excellent for preventing type 2 diabetes." },

  { id: 15, category: "prevention", categoryLabel: "Prévention", categoryLabelEn: "Prevention", icon: "☀️", color: "amber",
    title: "Protège-toi du soleil", titleEn: "Protect yourself from the sun",
    body: "Même en Afrique, les UV endommagent la peau et les yeux. Porte un chapeau, des lunettes de soleil et évite le soleil entre 12h et 15h.",
    bodyEn: "Even in Africa, UV rays damage skin and eyes. Wear a hat, sunglasses, and avoid the sun between noon and 3 pm." },

  { id: 16, category: "heart", categoryLabel: "Cœur", categoryLabelEn: "Heart", icon: "🚭", color: "red",
    title: "Le tabac touche aussi les non-fumeurs", titleEn: "Tobacco harms non-smokers too",
    body: "La fumée passive cause autant de dommages cardiovasculaires que le tabagisme actif. Protège ta famille en fumant à l'extérieur ou en arrêtant.",
    bodyEn: "Passive smoking causes as much cardiovascular damage as active smoking. Protect your family by smoking outside or quitting." },

  { id: 17, category: "hygiene", categoryLabel: "Hygiène", categoryLabelEn: "Hygiene", icon: "🦷", color: "teal",
    title: "Brosse-toi les dents 2 fois par jour", titleEn: "Brush your teeth twice a day",
    body: "Les maladies dentaires sont liées aux maladies cardiaques et au diabète. Brosse 2 minutes matin et soir et consulte un dentiste chaque année.",
    bodyEn: "Dental disease is linked to heart disease and diabetes. Brush for 2 minutes morning and evening and see a dentist once a year." },

  { id: 18, category: "mental", categoryLabel: "Santé mentale", categoryLabelEn: "Mental health", icon: "🤝", color: "purple",
    title: "Le lien social protège la santé", titleEn: "Social connection protects health",
    body: "L'isolement social augmente les risques de dépression et de démence. Prends le temps d'appeler un proche, de te retrouver avec ta communauté.",
    bodyEn: "Social isolation increases the risk of depression and dementia. Take time to call a loved one or gather with your community." },

  { id: 19, category: "nutrition", categoryLabel: "Nutrition", categoryLabelEn: "Nutrition", icon: "🫘", color: "green",
    title: "Les légumineuses, tes alliées", titleEn: "Legumes are your allies",
    body: "Haricots, lentilles, pois chiches sont riches en protéines végétales, fibres et fer. Parfaits pour les diabétiques et pour réduire le cholestérol.",
    bodyEn: "Beans, lentils, and chickpeas are rich in plant protein, fibre, and iron. Perfect for diabetics and for lowering cholesterol." },

  { id: 20, category: "prevention", categoryLabel: "Prévention", categoryLabelEn: "Prevention", icon: "🩺", color: "amber",
    title: "Consultation médicale annuelle", titleEn: "Annual medical check-up",
    body: "Même en bonne santé, un bilan annuel permet de détecter tôt le diabète, l'hypertension, les anémies. La prévention est toujours moins coûteuse que le traitement.",
    bodyEn: "Even in good health, an annual check-up can detect diabetes, hypertension, and anaemia early. Prevention is always cheaper than treatment." },

  { id: 21, category: "exercise", categoryLabel: "Activité physique", categoryLabelEn: "Physical activity", icon: "🚴", color: "orange",
    title: "Le vélo protège le cœur", titleEn: "Cycling protects your heart",
    body: "30 minutes de vélo par jour réduit le risque cardiovasculaire de 50%. C'est aussi bon pour les articulations que la course à pied en moins traumatisant.",
    bodyEn: "30 minutes of cycling a day reduces cardiovascular risk by 50%. It is as good for the joints as running but less traumatic." },

  { id: 22, category: "sleep", categoryLabel: "Sommeil", categoryLabelEn: "Sleep", icon: "🌙", color: "indigo",
    title: "Crée un rituel du coucher", titleEn: "Create a bedtime routine",
    body: "Un rituel régulier (tisane, lecture, étirements) signale au cerveau qu'il est l'heure de dormir. Tu t'endormiras 2x plus vite en 2 semaines.",
    bodyEn: "A regular routine (herbal tea, reading, stretching) signals to your brain that it is time to sleep. You will fall asleep twice as fast within 2 weeks." },

  { id: 23, category: "heart", categoryLabel: "Cœur", categoryLabelEn: "Heart", icon: "🧂", color: "red",
    title: "Réduis le sel dans tes plats", titleEn: "Reduce salt in your meals",
    body: "L'excès de sel est la première cause d'hypertension en Afrique de l'Ouest. Utilise des épices naturelles (gingembre, ail, citron) pour assaisonner.",
    bodyEn: "Excess salt is the leading cause of hypertension in West Africa. Use natural spices (ginger, garlic, lemon) for seasoning instead." },

  { id: 24, category: "hydration", categoryLabel: "Hydratation", categoryLabelEn: "Hydration", icon: "🌿", color: "blue",
    title: "Les tisanes, une bonne alternative", titleEn: "Herbal teas, a great alternative",
    body: "La citronnelle, le gingembre, la menthe et le moringa sont d'excellentes tisanes. Riches en antioxydants, elles hydratent et ont des propriétés médicinales.",
    bodyEn: "Lemongrass, ginger, mint, and moringa make excellent herbal teas. Rich in antioxidants, they hydrate and have medicinal properties." },

  { id: 25, category: "mental", categoryLabel: "Santé mentale", categoryLabelEn: "Mental health", icon: "🎵", color: "purple",
    title: "La musique soigne vraiment", titleEn: "Music really does heal",
    body: "Écouter de la musique agréable réduit le cortisol, abaisse la tension artérielle et libère de la dopamine. 20 minutes par jour ont un effet mesurable.",
    bodyEn: "Listening to enjoyable music reduces cortisol, lowers blood pressure, and releases dopamine. 20 minutes a day has a measurable effect." },

  { id: 26, category: "prevention", categoryLabel: "Prévention", categoryLabelEn: "Prevention", icon: "🔬", color: "amber",
    title: "Dépistage de la drépanocytose", titleEn: "Sickle cell disease screening",
    body: "En Afrique de l'Ouest, 1 personne sur 4 est porteuse du trait drépanocytaire. Un simple test sanguin suffit pour connaître ton statut et protéger tes enfants.",
    bodyEn: "In West Africa, 1 in 4 people carries the sickle cell trait. A simple blood test is enough to know your status and protect your children." },

  { id: 27, category: "nutrition", categoryLabel: "Nutrition", categoryLabelEn: "Nutrition", icon: "🥜", color: "green",
    title: "Les noix, un snack santé", titleEn: "Nuts, a healthy snack",
    body: "Une poignée d'arachides ou de noix de cajou par jour apporte des bons acides gras, de la vitamine E et du magnésium. Meilleur que les gâteaux industriels.",
    bodyEn: "A handful of peanuts or cashews a day provides healthy fatty acids, vitamin E, and magnesium. Far better than processed snacks." },

  { id: 28, category: "exercise", categoryLabel: "Activité physique", categoryLabelEn: "Physical activity", icon: "💃", color: "orange",
    title: "La danse, c'est du sport !", titleEn: "Dancing is exercise!",
    body: "30 minutes de danse brûlent autant de calories que le jogging, en plus de stimuler la coordination, la mémoire et l'humeur. Amuse-toi en te dépensant.",
    bodyEn: "30 minutes of dancing burns as many calories as jogging, while also boosting coordination, memory, and mood. Have fun while getting fit." },

  { id: 29, category: "hygiene", categoryLabel: "Hygiène", categoryLabelEn: "Hygiene", icon: "🥃", color: "teal",
    title: "Eau propre, vie saine", titleEn: "Clean water, healthy life",
    body: "L'eau non purifiée est source de choléra, typhoïde, hépatite A. Fais bouillir l'eau ou utilise un filtre certifié. L'investissement le plus important pour ta famille.",
    bodyEn: "Unpurified water is a source of cholera, typhoid, and hepatitis A. Boil your water or use a certified filter — the most important investment for your family." },

  { id: 30, category: "mental", categoryLabel: "Santé mentale", categoryLabelEn: "Mental health", icon: "🙏", color: "purple",
    title: "La gratitude améliore la santé", titleEn: "Gratitude improves health",
    body: "Écrire 3 choses positives chaque soir avant de dormir réduit l'anxiété, améliore le sommeil et renforce l'immunité. Essaie pendant 7 jours.",
    bodyEn: "Writing 3 positive things each evening before bed reduces anxiety, improves sleep, and boosts immunity. Try it for 7 days." },
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
