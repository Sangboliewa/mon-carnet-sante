"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LanguageContext";

interface Props {
  firstName: string;
}

export default function BienvenueClient({ firstName }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const STEPS = [
    {
      icon: "✅",
      color: "from-green-500 to-teal-500",
      title: t("Profil créé !", "Profile created!"),
      body: t(
        "Ton profil de santé personnel est maintenant actif. Toutes tes données médicales seront sécurisées et accessibles à tout moment.",
        "Your personal health profile is now active. All your medical data will be secured and accessible at any time."
      ),
      cta: null,
      ctaHref: null,
    },
    {
      icon: "📋",
      color: "from-blue-500 to-indigo-600",
      title: t("Ajoute tes antécédents", "Add your medical history"),
      body: t(
        "Renseigne tes allergies, maladies chroniques et vaccinations. Ces informations seront visibles sur ta carte d'urgence.",
        "Enter your allergies, chronic conditions and vaccinations. This information will appear on your emergency card."
      ),
      cta: t("Compléter mes antécédents", "Complete my medical history"),
      ctaHref: "/antecedents",
    },
    {
      icon: "⏰",
      color: "from-indigo-500 to-purple-600",
      title: t("Configure tes rappels", "Set up your reminders"),
      body: t(
        "Ne rate plus jamais un médicament. Configure des rappels quotidiens pour chaque traitement en cours.",
        "Never miss a medication again. Set up daily reminders for each ongoing treatment."
      ),
      cta: t("Configurer les rappels", "Configure reminders"),
      ctaHref: "/rappels",
    },
    {
      icon: "🤖",
      color: "from-blue-600 to-cyan-600",
      title: t("Rencontre By'", "Meet By'"),
      body: t(
        "By' est ton assistante santé IA. Elle t'aide à comprendre tes résultats d'examens, tes médicaments, et répond à tes questions de santé.",
        "By' is your AI health assistant. She helps you understand your test results, medications, and answers your health questions."
      ),
      cta: t("Discuter avec By'", "Chat with By'"),
      ctaHref: "/assistant",
    },
    {
      icon: "👨‍👩‍👧",
      color: "from-teal-500 to-green-600",
      title: t("Ajoute ta famille", "Add your family"),
      body: t(
        "Gère la santé de toute ta famille depuis un seul compte. Chaque membre a son profil et son carnet de santé indépendant.",
        "Manage your whole family's health from a single account. Each member has their own independent profile and health record."
      ),
      cta: t("Gérer ma famille", "Manage my family"),
      ctaHref: "/famille",
    },
  ];

  const [step, setStep] = useState(0);
  const router = useRouter();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) {
      router.push("/dashboard");
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200">
        <div
          className="h-full bg-health-blue rounded-full transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-1.5 pt-6 pb-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-health-blue w-6" : "bg-gray-200 w-1.5"}`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${current.color} flex items-center justify-center text-5xl mb-6 shadow-lg`}>
          {current.icon}
        </div>

        {step === 0 && (
          <p className="text-health-blue font-semibold text-sm mb-2 text-center">
            {t("Bienvenue", "Welcome")} {firstName} 🎉
          </p>
        )}

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">{current.title}</h1>
        <p className="text-gray-600 text-center leading-relaxed mb-8">{current.body}</p>

        <div className="w-full space-y-3">
          {current.ctaHref && (
            <Link href={current.ctaHref} className="btn-primary text-center block">
              {current.cta}
            </Link>
          )}
          <button
            onClick={next}
            className={current.ctaHref ? "btn-secondary" : "btn-primary"}
          >
            {isLast ? t("🏠 Aller au tableau de bord", "🏠 Go to dashboard") : t("Continuer →", "Continue →")}
          </button>
        </div>
      </div>

      {/* Skip */}
      <div className="pb-8 text-center">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 underline underline-offset-2"
        >
          {t("Passer le guide", "Skip the guide")}
        </button>
      </div>
    </div>
  );
}
