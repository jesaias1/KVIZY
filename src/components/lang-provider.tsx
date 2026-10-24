"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LANG_KEY,
  detectLang,
  getLang,
  setGlobalLang,
  type Lang,
} from "@/lib/i18n";

type LangContextValue = { lang: Lang; setLang: (lang: Lang) => void };
const LangContext = createContext<LangContextValue>({
  lang: "da",
  setLang: () => undefined,
});

/** Hver komponent, der bruger t(), tegnes igen, når sproget skifter, fordi
 *  roden (GameShell) læser sproget herfra. */
export const useLang = () => useContext(LangContext);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("da");

  const apply = useCallback((next: Lang) => {
    setGlobalLang(next);
    document.documentElement.lang = next;
    setLangState(next);
  }, []);

  useEffect(() => {
    // Efter hydrering: brug gemt sprog, ellers browserens.
    const id = window.setTimeout(() => {
      const initial = detectLang();
      if (initial !== getLang()) apply(initial);
      else document.documentElement.lang = initial;
    }, 0);
    return () => window.clearTimeout(id);
  }, [apply]);

  const setLang = useCallback(
    (next: Lang) => {
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch {
        // Valget huskes bare ikke til næste besøg.
      }
      apply(next);
    },
    [apply],
  );

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
