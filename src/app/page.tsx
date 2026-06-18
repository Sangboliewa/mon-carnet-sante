import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FEATURES = [
  { icon: "📋", title: "Antécédents complets", desc: "Allergies, maladies, vaccins, traitements, grossesse" },
  { icon: "🩺", title: "Consultations", desc: "Carnet médical, résultats labo, ordonnances" },
  { icon: "💊", title: "Rappels médicaments", desc: "Notifications push + SMS/WhatsApp via Twilio" },
  { icon: "🤖", title: "ABIBA — IA médicale", desc: "Comprendre vos examens et médicaments avec Claude AI" },
  { icon: "👨‍👩‍👧", title: "Gestion famille", desc: "Profils multiples, chaque membre a son carnet" },
  { icon: "🥗", title: "Nutrition & Activité", desc: "Journal alimentaire, exercices, IMC, suivi calories" },
  { icon: "😴", title: "Sommeil", desc: "Journal de sommeil, qualité, graphique 7 jours" },
  { icon: "📹", title: "Téléconsultation", desc: "Gérez vos consultations Meet, Zoom, WhatsApp" },
  { icon: "🏥", title: "Structures médicales", desc: "7 pays, 36 établissements, GPS et itinéraire" },
  { icon: "🚨", title: "Carte d'urgence", desc: "QR code partage rapide — accès sans connexion" },
  { icon: "📄", title: "Scanner IA", desc: "Ordonnances et résultats extraits automatiquement" },
  { icon: "🔒", title: "100% sécurisé", desc: "Chiffrement bout-en-bout, RLS Supabase, RGPD" },
];

const COUNTRIES = ["🇨🇮", "🇸🇳", "🇨🇲", "🇲🇱", "🇧🇫", "🇹🇬", "🇧🇯"];

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-health-blue via-blue-700 to-indigo-800 px-5 pt-16 pb-12">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-xl">
            🩺
          </div>
          <h1 className="text-white text-3xl font-extrabold leading-tight">
            Mon Carnet<br />Santé
          </h1>
          <p className="text-blue-200 text-base mt-3 leading-relaxed">
            Le passeport santé numérique pour l&apos;Afrique.<br />
            Centralisez, partagez et protégez votre dossier médical.
          </p>
          <div className="flex gap-3 justify-center mt-8">
            {COUNTRIES.map((flag, i) => (
              <span key={i} className="text-2xl">{flag}</span>
            ))}
          </div>
          <div className="flex flex-col gap-3 mt-8">
            <Link href="/signup"
              className="bg-white text-health-blue font-bold text-base px-8 py-4 rounded-2xl shadow-lg">
              Créer mon carnet gratuit
            </Link>
            <Link href="/login"
              className="text-white/90 font-medium text-sm py-2">
              Déjà inscrit ? Se connecter →
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-health-blue-light px-5 py-6">
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {[
            { val: "16+", label: "Modules santé" },
            { val: "7", label: "Pays couverts" },
            { val: "100%", label: "Gratuit" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-health-blue">{s.val}</p>
              <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Conçu pour les familles africaines — fonctionne hors ligne
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-semibold text-gray-900 text-sm mt-2">{f.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* IA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-10">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">K</div>
          <h2 className="text-white text-xl font-bold">ABIBA, votre assistante IA</h2>
          <p className="text-blue-200 text-sm mt-3 leading-relaxed">
            Powered by Claude AI · Explique vos résultats d&apos;analyses, identifie les interactions médicamenteuses et répond à vos questions de santé en français.
          </p>
        </div>
      </div>

      {/* APK */}
      <div className="px-5 py-10 bg-gray-50">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-3xl mb-3">📱</p>
          <h2 className="text-lg font-bold text-gray-900">Application Android</h2>
          <p className="text-sm text-gray-500 mt-2">
            Téléchargez l&apos;APK pour un accès natif, notifications et utilisation hors ligne.
          </p>
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-600">
            <p>Version 2.4 · Android 7.0+ · ~3 Mo</p>
            <p className="text-xs text-gray-400 mt-1">Contactez-nous pour recevoir l&apos;APK</p>
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div className="px-5 py-10 bg-health-blue">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-white text-xl font-bold">Commencez maintenant</h2>
          <p className="text-blue-200 text-sm mt-2">Gratuit · Aucune carte bancaire · Données sécurisées</p>
          <Link href="/signup"
            className="block mt-6 bg-white text-health-blue font-bold text-base px-8 py-4 rounded-2xl shadow-lg">
            Créer mon carnet santé
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 px-5 py-6 text-center">
        <p className="text-gray-400 text-xs">
          © 2026 Mon Carnet Santé · GBOL · Développé par Sangboliéwa Lanzeny Ouattara
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Données hébergées sur Supabase (EU) · Chiffrement SSL/TLS
        </p>
      </div>
    </div>
  );
}
