import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { enUS as dateEn, it as dateIt } from "date-fns/locale";
import type { Locale } from "date-fns";

export type Language = "it" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (l: Language) => void;
  /** Restituisce la stringa tradotta. IT è il fallback. */
  t: (it: string, en: string) => string;
  /** Locale date-fns coerente con la lingua corrente. */
  dateLocale: Locale;
  /** formatta numeri secondo la locale (es. separatore decimale). */
  formatNumber: (n: number | string, options?: Intl.NumberFormatOptions) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "gymbro.language";

/**
 * Legge la lingua corrente fuori dal React tree (utilità pure / SSR-safe).
 * Di default "it".
 */
export function getLanguage(): Language {
  if (typeof window === "undefined") return "it";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "it";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Language>(() => getLanguage());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((l: Language) => setLangState(l), []);

  const t = useCallback((it: string, en: string) => (language === "en" ? en : it), [language]);

  const dateLocale = language === "en" ? dateEn : dateIt;

  const formatNumber = useCallback(
    (n: number | string, options?: Intl.NumberFormatOptions) => {
      const num = typeof n === "string" ? parseFloat(n) : n;
      if (Number.isNaN(num)) return String(n);
      return new Intl.NumberFormat(language, options).format(num);
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dateLocale, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage deve essere usato dentro <LanguageProvider>");
  return ctx;
}

/**
 * Traduttore fuori dal React tree (es. schema di validazione Zod, helper puri).
 * Legge la lingua da localStorage. Non reattivo.
 */
export function tx(it: string, en: string): string {
  return getLanguage() === "en" ? en : it;
}
