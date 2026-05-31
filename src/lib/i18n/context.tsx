"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import fr from "./fr";
import en from "./en";

export type Locale = "fr" | "en";
export type Translations = typeof fr;

const TRANSLATIONS: Record<Locale, Translations> = { fr, en };
const COOKIE_NAME = "locale";

function getCookieLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const val = m ? decodeURIComponent(m[1]) : null;
  return val === "en" ? "en" : "fr";
}

function setCookieLocale(locale: Locale) {
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  t: fr,
  setLocale: () => {},
});

export function I18nProvider({
  children,
  initialLocale = "fr",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const saved = getCookieLocale();
    if (saved !== locale) setLocaleState(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setCookieLocale(l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: TRANSLATIONS[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
