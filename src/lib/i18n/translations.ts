export type Lang = "fr" | "en";

export const translations = {
  // Navigation
  dashboard: { fr: "Tableau de bord", en: "Dashboard" },
  profile: { fr: "Mon Profil", en: "My Profile" },
  family: { fr: "Famille", en: "Family" },
  settings: { fr: "Paramètres", en: "Settings" },
  logout: { fr: "Déconnexion", en: "Logout" },

  // Common actions
  save: { fr: "Enregistrer", en: "Save" },
  cancel: { fr: "Annuler", en: "Cancel" },
  edit: { fr: "Modifier", en: "Edit" },
  delete: { fr: "Supprimer", en: "Delete" },
  add: { fr: "Ajouter", en: "Add" },
  back: { fr: "Retour", en: "Back" },
  loading: { fr: "Chargement…", en: "Loading…" },
  saving: { fr: "Enregistrement…", en: "Saving…" },
  error: { fr: "Une erreur est survenue.", en: "An error occurred." },
  success: { fr: "Enregistré avec succès", en: "Saved successfully" },

  // Dashboard
  hello: { fr: "Bonjour,", en: "Hello," },
  activeProfile: { fr: "Profil actif", en: "Active profile" },
  quickAccess: { fr: "Accès rapides", en: "Quick access" },
  todayAppointments: { fr: "Rendez-vous aujourd'hui", en: "Today's appointments" },
  medicationsToday: { fr: "Médicaments aujourd'hui", en: "Medications today" },
  urgentAllergies: { fr: "Allergies graves", en: "Severe allergies" },
  reminders: { fr: "Rappels — 30 prochains jours", en: "Reminders — next 30 days" },
  activeProfiles: { fr: "profils", en: "profiles" },
  createProfile: { fr: "Créer mon profil", en: "Create my profile" },
  welcomeTitle: { fr: "Bienvenue !", en: "Welcome!" },
  welcomeSubtitle: { fr: "Créez votre profil de santé pour accéder à toutes les fonctionnalités.", en: "Create your health profile to access all features." },
  createProfileArrow: { fr: "Créer mon profil →", en: "Create my profile →" },

  // Modules
  symptoms: { fr: "Symptômes", en: "Symptoms" },
  agenda: { fr: "Agenda santé", en: "Health agenda" },
  medications: { fr: "Rappels médicaments", en: "Medication reminders" },
  labResults: { fr: "Résultats labo", en: "Lab results" },
  consultations: { fr: "Consultations", en: "Consultations" },
  documents: { fr: "Coffre-fort", en: "Safe" },
  pediatrics: { fr: "Pédiatrie", en: "Pediatrics" },
  nutrition: { fr: "Nutrition", en: "Nutrition" },
  structures: { fr: "Structures", en: "Health facilities" },
  export: { fr: "Export PDF", en: "PDF Export" },
  activity: { fr: "Activité", en: "Activity" },
  sleep: { fr: "Sommeil", en: "Sleep" },
  watch: { fr: "Montre connectée", en: "Connected watch" },
  teleconsult: { fr: "Téléconsult.", en: "Teleconsult." },
  antecedents: { fr: "Antécédents", en: "Medical history" },
  healthDashboard: { fr: "Tableau de bord", en: "Health Dashboard" },

  // Scanner
  scanTitle: { fr: "Scanner un document", en: "Scan a document" },
  scanSubtitle: { fr: "Photographiez ou importez une ordonnance, un résultat d'examen ou un compte-rendu (JPEG, PNG, PDF)", en: "Photograph or import a prescription, exam result or report (JPEG, PNG, PDF)" },
  camera: { fr: "Caméra", en: "Camera" },
  importFile: { fr: "Importer", en: "Import" },
  analyzeDoc: { fr: "Analyser le document", en: "Analyze document" },
  analyzing: { fr: "Analyse en cours…", en: "Analyzing…" },
  saveData: { fr: "Enregistrer", en: "Save" },
  restart: { fr: "Recommencer", en: "Start over" },

  // Profile
  firstName: { fr: "Prénom", en: "First name" },
  lastName: { fr: "Nom", en: "Last name" },
  dateOfBirth: { fr: "Date de naissance", en: "Date of birth" },
  gender: { fr: "Genre", en: "Gender" },
  male: { fr: "Masculin", en: "Male" },
  female: { fr: "Féminin", en: "Female" },
  other: { fr: "Autre", en: "Other" },
  bloodType: { fr: "Groupe sanguin", en: "Blood type" },
  height: { fr: "Taille (cm)", en: "Height (cm)" },
  weight: { fr: "Poids (kg)", en: "Weight (kg)" },
  emergencyContact: { fr: "Contact d'urgence", en: "Emergency contact" },
  phone: { fr: "Téléphone", en: "Phone" },
  identity: { fr: "Identité", en: "Identity" },
  medicalData: { fr: "Données médicales", en: "Medical data" },
  saveProfile: { fr: "Enregistrer le profil", en: "Save profile" },

  // Settings
  settingsTitle: { fr: "Paramètres", en: "Settings" },
  language: { fr: "Langue", en: "Language" },
  theme: { fr: "Thème", en: "Theme" },
  notifications: { fr: "Notifications", en: "Notifications" },
  account: { fr: "Compte", en: "Account" },
  privacy: { fr: "Confidentialité", en: "Privacy" },
  security: { fr: "Sécurité", en: "Security" },
  about: { fr: "À propos", en: "About" },
  french: { fr: "Français", en: "French" },
  english: { fr: "Anglais", en: "English" },

  // By'
  "By'Subtitle": { fr: "Assistante Santé IA · en ligne", en: "AI Health Assistant · online" },
  "By'Welcome": { fr: "Je suis By', ton assistante santé personnelle. Je peux t'aider à comprendre tes examens, tes médicaments ou répondre à tes questions de santé.", en: "I am By', your personal health assistant. I can help you understand your exams, medications, or answer your health questions." },
  "By'Disclaimer": { fr: "⚕️ Je suis un outil éducatif, pas un médecin. Consulte toujours un professionnel de santé.", en: "⚕️ I am an educational tool, not a doctor. Always consult a healthcare professional." },
  "By'Placeholder": { fr: "Pose ta question à By'…", en: "Ask By' a question…" },
  "By'Footer": { fr: "By' ne remplace pas un médecin · Urgences :", en: "By' does not replace a doctor · Emergency:" },
  suggestions: { fr: "Suggestions", en: "Suggestions" },

  // Famille
  uploadError: { fr: "Erreur upload", en: "Upload error" },
  addFamilyMember: { fr: "+ Ajouter un membre de la famille", en: "+ Add a family member" },
  editProfile: { fr: "Modifier le profil", en: "Edit profile" },
  newMember: { fr: "Nouveau membre", en: "New member" },
  deleteFamilyConfirm: { fr: "Supprimer ce profil ? Toutes ses données médicales seront effacées.", en: "Delete this profile? All medical data will be erased." },

  // Résultats labo
  enterResult: { fr: "+ Saisir un résultat", en: "+ Enter a result" },
  addResult: { fr: "+ Ajouter un résultat", en: "+ Add a result" },

  // Symptômes
  none: { fr: "Aucune", en: "None" },
} as const;

export type TKey = keyof typeof translations;

export function t(key: TKey, lang: Lang): string {
  return translations[key][lang];
}
