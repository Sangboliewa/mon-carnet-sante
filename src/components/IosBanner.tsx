"use client";
import { useEffect, useState } from "react";

export default function IosBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Détecte iOS Safari (pas en mode standalone = pas déjà installée)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = ("standalone" in navigator) && (navigator as Record<string, unknown>).standalone === true;
    const dismissed = localStorage.getItem("ios_banner_dismissed");

    if (isIos && !isStandalone && !dismissed) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem("ios_banner_dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
      <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl">
        <button onClick={dismiss} className="absolute top-3 right-3 text-gray-400 text-lg leading-none">✕</button>
        <p className="font-semibold text-sm mb-1">📱 Installe l&apos;app sur iPhone</p>
        <p className="text-xs text-gray-300 leading-relaxed">
          Appuie sur <span className="inline-block bg-gray-700 rounded px-1.5 py-0.5 text-white font-medium">⬆ Partager</span> en bas de Safari,
          puis <span className="font-medium text-blue-300">"Sur l'écran d'accueil"</span> pour accéder hors-ligne.
        </p>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <span className="text-xl">⬆️</span>
            <div>
              <p className="text-[10px] text-gray-400">Étape 1</p>
              <p className="text-xs font-medium">Touche Partager</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <span className="text-xl">➕</span>
            <div>
              <p className="text-[10px] text-gray-400">Étape 2</p>
              <p className="text-xs font-medium">Écran d&apos;accueil</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
