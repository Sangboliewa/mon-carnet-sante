"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    icon: "✅",
    color: "from-green-500 to-teal-500",
    title: "Profil créé !",
    body: "Ton profil de santé personnel est maintenant actif. Toutes tes données médicales seront sécurisées et accessibles à tout moment.",
    cta: null,
    ctaHref: null,
  },
  {
    icon: "📋",
    color: "from-blue-500 to-indigo-600",
    title: "Ajoute tes antécédents",
    body: "Renseigne tes allergies, maladies chroniques et vaccinations. Ces informations seront visibles sur ta carte d'urgence.",
    cta: "Compléter mes antécédents",
    ctaHref: "/antecedents",
  },
  {
    icon: "⏰",
    color: "from-indigo-500 to-purple-600",
    title: "Configure tes rappels",
    body: "Ne rate plus jamais un médicament. Configure des rappels quotidiens pour chaque traitement en cours.",
    cta: "Configurer les rappels",
    ctaHref: "/rappels",
  },
  {
    icon: "🤖",
    color: "from-blue-600 to-cyan-600",
    title: "Rencontre ABIBA",
    body: "ABIBA est ton assistante santé IA. Elle t'aide à comprendre tes résultats d'examens, tes médicaments, et répond à tes questions de santé.",
    cta: "Discuter avec ABIBA",
    ctaHref: "/assistant",
  },
  {
    icon: "👨‍👩‍👧",
    color: "from-teal-500 to-green-600",
    title: "Ajoute ta famille",
    body: "Gère la santé de toute ta famille depuis un seul compte. Chaque membre a son profil et son carnet de santé indépendant.",
    cta: "Gérer ma famille",
    ctaHref: "/famille",
  },
];

interface Props {
  firstName: string;
}

export default function BienvenueClient({ firstName }: Props) {
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
            Bienvenue {firstName} 🎉
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
            {isLast ? "🏠 Aller au tableau de bord" : "Continuer →"}
          </button>
        </div>
      </div>

      {/* Skip */}
      <div className="pb-8 text-center">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 underline underline-offset-2"
        >
          Passer le guide
        </button>
      </div>
    </div>
  );
}
