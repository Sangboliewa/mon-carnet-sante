import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FEATURES = [
  { icon: "📋", title: "Antécédents complets", desc: "Allergies, maladies, vaccins, traitements" },
  { icon: "🩺", title: "Consultations", desc: "Carnet médical, résultats labo, ordonnances" },
  { icon: "💊", title: "Rappels médicaments", desc: "Notifications push + WhatsApp" },
  { icon: "🤖", title: "By' — IA médicale", desc: "Vos examens expliqués en français" },
  { icon: "👨‍👩‍👧", title: "Gestion famille", desc: "Profils multiples, chaque membre a son carnet" },
  { icon: "🥗", title: "Nutrition", desc: "Journal alimentaire, eau, calories, macros" },
  { icon: "🚨", title: "Carte d'urgence", desc: "Accès rapide sans connexion — numéros locaux" },
  { icon: "🏥", title: "Structures médicales", desc: "7 pays, 36 établissements avec GPS" },
  { icon: "📄", title: "Scanner IA", desc: "Ordonnances extraites automatiquement" },
  { icon: "😴", title: "Sommeil & Activité", desc: "Journal de sommeil, exercices, IMC" },
  { icon: "📹", title: "Téléconsultation", desc: "Meet, Zoom, WhatsApp — tout centralisé" },
  { icon: "🔒", title: "100% sécurisé", desc: "Chiffrement SSL, RLS Supabase, RGPD" },
];

const STEPS = [
  { num: "1", icon: "📝", title: "Créez votre compte", desc: "Inscription gratuite en 30 secondes — aucune carte bancaire requise." },
  { num: "2", icon: "👤", title: "Complétez votre profil", desc: "Groupe sanguin, antécédents, contacts d'urgence. Notre guide pas-à-pas vous aide." },
  { num: "3", icon: "🏥", title: "Partagez à votre médecin", desc: "QR code, impression PDF ou lien sécurisé — votre dossier complet en 1 tap." },
];

const TESTIMONIALS = [
  { name: "Aïcha K.", role: "Mère de famille, Abidjan", text: "Je gère les carnets de santé de mes 3 enfants depuis une seule appli. Fini les papiers perdus !", flag: "🇨🇮" },
  { name: "Dr. Moussa D.", role: "Médecin généraliste, Dakar", text: "Mes patients arrivent avec un QR code et je vois tout l'historique en secondes. Révolutionnaire.", flag: "🇸🇳" },
  { name: "Fatou T.", role: "Infirmière, Ouagadougou", text: "By' explique les résultats à mes patients qui ne comprennent pas les ordonnances. Très utile.", flag: "🇧🇫" },
];

const COUNTRIES = [
  { flag: "🇨🇮", name: "Côte d'Ivoire" },
  { flag: "🇸🇳", name: "Sénégal" },
  { flag: "🇨🇲", name: "Cameroun" },
  { flag: "🇲🇱", name: "Mali" },
  { flag: "🇧🇫", name: "Burkina Faso" },
  { flag: "🇹🇬", name: "Togo" },
  { flag: "🇧🇯", name: "Bénin" },
];

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="bg-gradient-to-br from-health-blue via-blue-700 to-indigo-800 px-5 pt-16 pb-14 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 -left-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="max-w-lg mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-white/90 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Gratuit · Aucune carte bancaire
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-xl shadow-black/20">
            🩺
          </div>
          <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
            Mon Carnet<br />Santé
          </h1>
          <p className="text-blue-200 text-base mt-4 leading-relaxed max-w-xs mx-auto">
            Le passeport santé numérique conçu pour les familles africaines.
          </p>
          <div className="flex flex-col gap-3 mt-8">
            <Link href="/signup"
              className="bg-white text-health-blue font-bold text-base px-8 py-4 rounded-2xl shadow-lg shadow-black/20 active:scale-95 transition-transform">
              Créer mon carnet gratuit →
            </Link>
            <Link href="/login" className="text-white/80 font-medium text-sm py-2">
              Déjà inscrit ? Se connecter
            </Link>
          </div>
          <div className="flex justify-center gap-2 mt-8 flex-wrap">
            {COUNTRIES.map((c) => (
              <span key={c.name} title={c.name} className="text-2xl">{c.flag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-health-blue-light border-b border-blue-100 px-5 py-5">
        <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto text-center">
          {[
            { val: "16+", label: "Modules" },
            { val: "7", label: "Pays" },
            { val: "100%", label: "Gratuit" },
            { val: "iOS+Android", label: "Multi-plateforme" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-lg font-extrabold text-health-blue leading-tight">{s.val}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="px-5 py-12 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Comment ça marche ?</h2>
          <p className="text-sm text-gray-500 text-center mb-8">3 étapes pour avoir votre dossier santé complet</p>
          <div className="space-y-5">
            {STEPS.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-health-blue to-indigo-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-md shadow-blue-100">
                  {step.icon}
                </div>
                <div className="pt-1">
                  <span className="text-xs font-bold text-health-blue bg-blue-50 px-2 py-0.5 rounded-full">Étape {step.num}</span>
                  <p className="font-semibold text-gray-900 mt-1">{step.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Témoignages */}
      <div className="bg-gray-50 px-5 py-10">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Ils font confiance à Mon Carnet Santé</h2>
          <div className="space-y-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{t.flag}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                  <div className="ml-auto text-yellow-400 text-sm">★★★★★</div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic">&quot;{t.text}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fonctionnalités */}
      <div className="px-5 py-12 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Tout ce dont vous avez besoin</h2>
          <p className="text-sm text-gray-500 text-center mb-8">Fonctionne hors ligne · Données sécurisées</p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 active:scale-95 transition-transform">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-semibold text-gray-900 text-sm mt-2">{f.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By' IA */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-5 py-12 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="max-w-lg mx-auto text-center relative">
          <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">🤖</div>
          <h2 className="text-white text-2xl font-bold">Rencontrez By'</h2>
          <p className="text-indigo-200 text-sm mt-1 font-medium">Votre assistante médicale IA</p>
          <p className="text-indigo-100 text-sm mt-4 leading-relaxed max-w-sm mx-auto">
            Posez vos questions de santé en français. By' explique vos résultats d&apos;analyses, identifie les interactions médicamenteuses et vous oriente vers les bons spécialistes.
          </p>
          <div className="mt-6 bg-white/10 rounded-2xl p-4 text-left max-w-sm mx-auto">
            <p className="text-white/60 text-xs uppercase tracking-wide mb-2">Exemple de question</p>
            <p className="text-white text-sm italic">
              &quot;Mon taux de glycémie est à 1,26 g/L, est-ce normal ? Que dois-je faire ?&quot;
            </p>
          </div>
          <Link href="/signup"
            className="inline-block mt-6 bg-white text-indigo-700 font-bold text-sm px-8 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform">
            Essayer By' gratuitement
          </Link>
        </div>
      </div>

      {/* Application */}
      <div className="px-5 py-10 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Disponible partout</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100 text-center">
              <p className="text-3xl mb-2">🤖</p>
              <p className="font-bold text-gray-900 text-sm">Android</p>
              <p className="text-xs text-gray-500 mt-1">APK disponible</p>
              <div className="mt-3 bg-white rounded-xl px-3 py-2 border border-green-100">
                <p className="text-xs text-gray-500">v2.4 · Android 7.0+ · ~3 Mo</p>
              </div>
              <p className="text-xs text-green-700 mt-2">Contactez-nous pour l&apos;APK</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 text-center">
              <p className="text-3xl mb-2">🍎</p>
              <p className="font-bold text-gray-900 text-sm">iPhone / Web</p>
              <p className="text-xs text-gray-500 mt-1">Application Web progressive</p>
              <div className="mt-3 bg-white rounded-xl px-3 py-2 border border-blue-100">
                <p className="text-xs text-gray-500">Safari → Partager → Écran d&apos;accueil</p>
              </div>
              <p className="text-xs text-blue-700 mt-2">Fonctionne hors ligne</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div className="px-5 py-12 bg-gradient-to-br from-health-blue to-indigo-700">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-4xl mb-4">❤️</p>
          <h2 className="text-white text-2xl font-extrabold leading-tight">
            Commencez dès aujourd&apos;hui
          </h2>
          <p className="text-blue-200 text-sm mt-2 max-w-xs mx-auto">
            Rejoignez des milliers de familles africaines qui prennent soin de leur santé
          </p>
          <Link href="/signup"
            className="block mt-6 bg-white text-health-blue font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-black/20 active:scale-95 transition-transform">
            Créer mon carnet santé — Gratuit
          </Link>
          <Link href="/login" className="block text-blue-200 text-sm mt-4 py-2">
            Déjà un compte ? Se connecter
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 px-5 py-6">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-white font-semibold text-sm mb-1">Mon Carnet Santé</p>
          <p className="text-gray-400 text-xs">
            © 2026 GBOL · Développé par Sangboliéwa Lanzeny Ouattara
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Données hébergées sur Supabase (EU) · Chiffrement SSL/TLS · RGPD
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <Link href="/login" className="hover:text-gray-300">Connexion</Link>
            <Link href="/signup" className="hover:text-gray-300">Inscription</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
