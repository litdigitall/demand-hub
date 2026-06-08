/* ============================================================
   i18n leve — PT-BR / EN.
   Sem dependências externas. Persiste a escolha em localStorage.
   ============================================================ */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dicts, type Lang, type TKey } from "./dicts";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const LS_KEY = "pulse.lang";

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LS_KEY) as Lang | null;
    if (saved === "pt" || saved === "en" || saved === "es") return saved;
  } catch {
    /* ignore */
  }
  const browser = navigator.language?.toLowerCase() ?? "";
  if (browser.startsWith("en")) return "en";
  if (browser.startsWith("es")) return "es";
  return "pt";
}

const Context = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang());

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang =
      lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";
  }, [lang]);

  function t(key: TKey, vars?: Record<string, string | number>): string {
    const dict = dicts[lang];
    let v = (dict[key] ?? dicts.pt[key] ?? key) as string;
    if (vars) {
      Object.entries(vars).forEach(([k, val]) => {
        v = v.replace(new RegExp(`\\{${k}\\}`, "g"), String(val));
      });
    }
    return v;
  }

  return (
    <Context.Provider value={{ lang, setLang: setLangState, t }}>
      {children}
    </Context.Provider>
  );
}

export function useT() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useT precisa estar dentro de <I18nProvider>");
  return ctx;
}

export type { Lang, TKey } from "./dicts";
