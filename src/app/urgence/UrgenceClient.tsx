"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Person } from "@/lib/supabase/types";
import { useLang } from "@/lib/i18n/LanguageContext";

interface Allergy { allergen: string; severity: string | null }
interface Condition { condition_name: string }
interface TreatmentSummary { medication_name: string; dosage: string | null }

interface Props {
  person: Person;
  allergies: Allergy[];
  treatments: TreatmentSummary[];
  conditions: Condition[];
}

const EMERGENCY_NUMBERS = [
  { country: "🇨🇮 Côte d'Ivoire", samu: "185", police: "170", pompiers: "180" },
  { country: "🇸🇳 Sénégal",       samu: "15",  police: "17",  pompiers: "18" },
  { country: "🇧🇫 Burkina Faso",  samu: "112", police: "17",  pompiers: "18" },
  { country: "🇲🇱 Mali",          samu: "15",  police: "17",  pompiers: "18" },
  { country: "🇨🇲 Cameroun",      samu: "119", police: "17",  pompiers: "18" },
  { country: "🇨🇬 Congo",         samu: "15",  police: "17",  pompiers: "18" },
  { country: "🇹🇬 Togo",          samu: "15",  police: "17",  pompiers: "18" },
];

export default function UrgenceClient({ person, allergies, treatments, conditions }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showNumbers, setShowNumbers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const age = person.date_of_birth
    ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  useEffect(() => {
    async function fetchToken() {
      setLoadingToken(true);
      try {
        const res = await fetch("/api/urgence/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: person.id }),
        });
        if (res.ok) {
          const { token } = await res.json() as { token: string };
          const url = `${window.location.origin}/u/${token}`;
          setPublicUrl(url);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingToken(false);
      }
    }
    fetchToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person.id]);

  useEffect(() => {
    if (!publicUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, publicUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#1E3A5F", light: "#FFFFFF" },
    }).catch(console.error);
  }, [publicUrl]);

  async function handleShare() {
    const text = [
      `🆘 ${t("URGENCE", "EMERGENCY")} — ${person.first_name} ${person.last_name ?? ""}`,
      age ? `${t("Âge", "Age")} : ${age} ${t("ans", "y.o.")}` : "",
      person.blood_type ? `${t("Groupe sanguin", "Blood type")} : ${person.blood_type}` : "",
      allergies.length ? `${t("Allergies", "Allergies")} : ${allergies.map(a => a.allergen).join(", ")}` : "",
      treatments.length ? `${t("Traitements", "Treatments")} : ${treatments.map(tr => tr.medication_name).join(", ")}` : "",
      conditions.length ? `${t("Antécédents", "Medical history")} : ${conditions.map(c => c.condition_name).join(", ")}` : "",
      person.emergency_contact_name ? `${t("Contact d'urgence", "Emergency contact")} : ${person.emergency_contact_name} — ${person.emergency_contact_phone}` : "",
      publicUrl ? `${t("Fiche complète", "Full profile")} : ${publicUrl}` : "",
    ].filter(Boolean).join("\n");

    if (navigator.share) {
      await navigator.share({ title: t("Carte d'urgence", "Emergency card"), text, url: publicUrl ?? undefined });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function copyPublicUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  return (
    <div className="px-4 py-5 space-y-4">

      <a
        href="tel:185"
        className="flex items-center justify-center gap-3 bg-red-600 active:bg-red-700 text-white font-bold text-xl rounded-2xl py-5 shadow-lg shadow-red-200"
      >
        <span className="text-3xl">📞</span>
        {t("APPELER LE SAMU — 185", "CALL EMERGENCY — 185")}
      </a>

      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 text-white space-y-3 shadow-xl shadow-red-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🆘</span>
            <span className="font-bold text-base tracking-wide uppercase">{t("Carte d'urgence", "Emergency card")}</span>
          </div>
          <button onClick={handleShare} className="bg-white/20 active:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-semibold">
            {copied ? `✅ ${t("Copié", "Copied")}` : `⬆ ${t("Partager", "Share")}`}
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">{t("Patient", "Patient")}</p>
            <p className="font-bold text-lg leading-tight">{person.first_name} {person.last_name}</p>
            {age && <p className="text-sm opacity-85 mt-0.5">{age} {t("ans", "y.o.")} · {person.date_of_birth}</p>}
            {person.gender && (
              <p className="text-xs opacity-70 mt-0.5">
                {person.gender === "male" ? t("Homme", "Male") : person.gender === "female" ? t("Femme", "Female") : t("Autre", "Other")}
              </p>
            )}
          </div>
          {person.blood_type && (
            <div className="w-24 bg-white/15 rounded-xl p-3 flex flex-col items-center justify-center">
              <p className="text-xs opacity-70 uppercase tracking-wide mb-1">{t("Groupe", "Blood type")}</p>
              <p className="font-black text-4xl">{person.blood_type}</p>
            </div>
          )}
        </div>

        {allergies.length > 0 && (
          <div className="bg-yellow-400/25 border border-yellow-300/50 rounded-xl p-3">
            <p className="text-xs font-bold uppercase tracking-wide mb-1.5">⚠️ {t("Allergies — NE PAS ADMINISTRER", "Allergies — DO NOT ADMINISTER")}</p>
            {allergies.map((a, i) => (
              <p key={i} className="font-semibold text-sm">
                • {a.allergen}
                {a.severity === "life_threatening" && <span className="ml-2 text-yellow-200 font-bold">⚡ {t("VIE EN DANGER", "LIFE THREATENING")}</span>}
              </p>
            ))}
          </div>
        )}

        {treatments.length > 0 && (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">💊 {t("Traitements en cours", "Current treatments")}</p>
            {treatments.map((tr, i) => (
              <p key={i} className="text-sm font-medium">• {tr.medication_name}{tr.dosage ? ` — ${tr.dosage}` : ""}</p>
            ))}
          </div>
        )}

        {conditions.length > 0 && (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">🫀 {t("Antécédents médicaux", "Medical history")}</p>
            {conditions.map((c, i) => (
              <p key={i} className="text-sm font-medium">• {c.condition_name}</p>
            ))}
          </div>
        )}

        {person.emergency_contact_name ? (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">📞 {t("Contact d'urgence", "Emergency contact")}</p>
            <p className="font-semibold">{person.emergency_contact_name}</p>
            {person.emergency_contact_phone && (
              <a href={`tel:${person.emergency_contact_phone}`} className="text-yellow-200 font-bold text-lg block mt-0.5">
                {person.emergency_contact_phone}
              </a>
            )}
          </div>
        ) : (
          <a href="/profil" className="bg-white/10 border border-white/30 rounded-xl p-3 flex items-center gap-2">
            <span className="text-lg">➕</span>
            <span className="text-sm font-medium opacity-90">{t("Ajouter un contact d'urgence", "Add an emergency contact")}</span>
          </a>
        )}
      </div>

      <div className="card flex flex-col items-center gap-3 py-6">
        <div className="flex items-center gap-2">
          <span className="text-base">📲</span>
          <p className="text-sm font-semibold text-gray-700">{t("QR code — fiche urgence publique", "QR code — public emergency profile")}</p>
        </div>

        <div className="relative">
          {loadingToken && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
              <div className="animate-spin text-2xl">⏳</div>
            </div>
          )}
          <canvas ref={canvasRef} className="rounded-xl border border-gray-100" />
        </div>

        <p className="text-xs text-gray-500 text-center max-w-xs">
          {t(
            "Quelqu'un peut scanner ce QR code sans connexion pour voir ta fiche d'urgence complète.",
            "Anyone can scan this QR code without an account to view your full emergency profile."
          )}
        </p>

        {publicUrl && (
          <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
            <p className="flex-1 text-xs text-blue-700 font-mono truncate">{publicUrl}</p>
            <button
              onClick={copyPublicUrl}
              className="flex-shrink-0 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5"
            >
              {urlCopied ? "✅" : t("Copier", "Copy")}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          {t(
            "Ce lien est permanent · imprime-le ou mets-le sur ton bracelet médical",
            "This link is permanent · print it or put it on your medical bracelet"
          )}
        </p>
      </div>

      <div className="card">
        <button
          onClick={() => setShowNumbers(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <span className="font-semibold text-gray-800 text-sm">🌍 {t("Numéros d'urgence par pays", "Emergency numbers by country")}</span>
          <span className="text-gray-400 text-xs">{showNumbers ? "▲" : "▼"}</span>
        </button>

        {showNumbers && (
          <div className="mt-3 space-y-2">
            {EMERGENCY_NUMBERS.map((n, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <p className="font-semibold text-sm text-gray-800 mb-1.5">{n.country}</p>
                <div className="flex gap-2">
                  <a href={`tel:${n.samu}`} className="flex-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-red-500 font-medium">SAMU</p>
                    <p className="font-bold text-red-700 text-base">{n.samu}</p>
                  </a>
                  <a href={`tel:${n.police}`} className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-blue-500 font-medium">{t("Police", "Police")}</p>
                    <p className="font-bold text-blue-700 text-base">{n.police}</p>
                  </a>
                  <a href={`tel:${n.pompiers}`} className="flex-1 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-orange-500 font-medium">{t("Pompiers", "Fire dept.")}</p>
                    <p className="font-bold text-orange-700 text-base">{n.pompiers}</p>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-center text-gray-400 pb-2">
        {t("Données chiffrées · Mon Carnet Santé · GBOL", "Encrypted data · Mon Carnet Santé · GBOL")}
      </p>
    </div>
  );
}
