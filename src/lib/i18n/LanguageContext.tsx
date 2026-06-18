"use client";
/**
 * LanguageContext — thin bridge over the existing I18nContext.
 * Exposes `useLang()` with { lang, setLang, t } for components
 * that use the new bilingual API, while the underlying state lives
 * in I18nProvider (already mounted in layout.tsx).
 */
import { useI18n, type Locale } from "./context";
import { type TKey, t as translate } from "./translations";

export type Lang = Locale;

export interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

export function useLang(): LangContextType {
  const { locale, setLocale } = useI18n();

  function t(key: TKey): string {
    return translate(key, locale);
  }

  return { lang: locale, setLang: setLocale, t };
}

// Re-export LanguageProvider as a no-op passthrough so any import still compiles.
// The real provider is I18nProvider in layout.tsx.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
