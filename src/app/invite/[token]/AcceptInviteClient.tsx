"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LanguageContext";

interface Props {
  token: string;
  personName: string;
  role: string;
  isLoggedIn: boolean;
}

const ROLE_LABELS_FR: Record<string, string> = { viewer: "Lecteur", editor: "Éditeur" };
const ROLE_LABELS_EN: Record<string, string> = { viewer: "Viewer", editor: "Editor" };

export default function AcceptInviteClient({ token, personName, role, isLoggedIn }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const ROLE_LABELS = lang === "en" ? ROLE_LABELS_EN : ROLE_LABELS_FR;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? t("Erreur", "Error")); setLoading(false); return; }
      setDone(true);
      setTimeout(() => router.push("/famille"), 1800);
    } catch {
      setError(t("Erreur réseau", "Network error"));
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-6xl">✅</div>
          <h1 className="text-xl font-bold text-gray-900">{t("Invitation acceptée !", "Invitation accepted!")}</h1>
          <p className="text-sm text-gray-500">{t("Vous avez accès au carnet de", "You now have access to")} <strong>{personName}</strong>{lang === "en" ? "'s health record." : "."}</p>
          <p className="text-xs text-gray-400">{t("Redirection…", "Redirecting…")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">👨‍👩‍👧</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("Invitation famille", "Family invitation")}</h1>
          <p className="text-sm text-gray-500">
            {t("Vous êtes invité(e) à accéder au carnet de santé de", "You have been invited to access the health record of")}{" "}
            <strong className="text-gray-800">{personName}</strong>
          </p>
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
            {t("Rôle", "Role")} : {ROLE_LABELS[role] ?? role}
          </span>
        </div>

        {!isLoggedIn && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>{t("Connexion requise.", "Login required.")}</strong> {t("Vous devez être connecté(e) pour accepter cette invitation.", "You must be logged in to accept this invitation.")}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        {isLoggedIn ? (
          <button
            onClick={accept}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-health-blue text-white font-bold text-base disabled:opacity-50"
          >
            {loading ? t("Acceptation…", "Accepting…") : t("Accepter l'invitation", "Accept invitation")}
          </button>
        ) : (
          <button
            onClick={() => router.push(`/auth/login?redirect=/invite/${token}`)}
            className="w-full py-3.5 rounded-xl bg-health-blue text-white font-bold text-base"
          >
            {t("Se connecter pour accepter", "Log in to accept")}
          </button>
        )}

        <p className="text-center text-xs text-gray-400">
          {t("Cette invitation expire dans 7 jours.", "This invitation expires in 7 days.")}
        </p>
      </div>
    </div>
  );
}
