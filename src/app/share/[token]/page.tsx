"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ShareData {
  signedUrl: string;
  filename: string;
  expiresAt: string;
}

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<ShareData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/share/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setErrorMsg(json.error ?? "Erreur inconnue");
          setState("error");
        } else {
          setData(json);
          setState("ready");
        }
      })
      .catch(() => {
        setErrorMsg("Impossible de contacter le serveur.");
        setState("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏥</div>
          <h1 className="text-xl font-bold text-gray-900">Mon Carnet Santé</h1>
          <p className="text-sm text-gray-500 mt-1">Document médical partagé</p>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="animate-spin text-3xl mb-3">⏳</div>
            <p className="text-gray-600 text-sm">Vérification du lien en cours…</p>
          </div>
        )}

        {/* Erreur */}
        {state === "error" && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h2 className="font-semibold text-gray-900">Lien inaccessible</h2>
            <p className="text-sm text-red-600">{errorMsg}</p>
            <p className="text-xs text-gray-400">
              Ce lien est peut-être expiré, révoqué, ou a atteint son nombre maximum d&apos;accès.
              Demandez un nouveau lien à la personne qui vous l&apos;a envoyé.
            </p>
          </div>
        )}

        {/* Succès */}
        {state === "ready" && data && (
          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">📄</div>
              <h2 className="font-semibold text-gray-900">{data.filename}</h2>
              <p className="text-xs text-gray-400 mt-1">
                Lien valide jusqu&apos;au{" "}
                {new Date(data.expiresAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠️ Ce document contient des informations médicales confidentielles.
              Il vous a été transmis par votre patient dans le cadre d&apos;une consultation.
              Ne le redistribuez pas.
            </div>

            <a
              href={data.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-health-blue text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              📂 Ouvrir le document
            </a>

            <p className="text-center text-xs text-gray-400">
              L&apos;accès à ce document a été enregistré pour des raisons de sécurité.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">
          Propulsé par Mon Carnet Santé · GBOL
        </p>
      </div>
    </div>
  );
}
