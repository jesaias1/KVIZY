import { EN } from "./en";

// Enkel oversættelse: de danske tekster i koden er selv nøglerne, og engelsk
// slås op i EN. Mangler en nøgle, vises den danske tekst, så intet går i stykker.
// t() læser det aktuelle sprog fra en global, som LangProvider sætter, før
// brugerfladen tegnes igen.

export type Lang = "da" | "en";
export const LANG_KEY = "kvizy-lang-v1";
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: "da", label: "Dansk", flag: "DA" },
  { id: "en", label: "English", flag: "EN" },
];

let current: Lang = "da";
export const getLang = (): Lang => current;
export const setGlobalLang = (lang: Lang) => {
  current = lang;
};

const missing = new Set<string>();

export function t(text: string, vars?: Record<string, string | number>) {
  let out = text;
  if (current === "en") {
    const translated = EN[text];
    if (translated === undefined) {
      if (process.env.NODE_ENV === "development" && !missing.has(text)) {
        missing.add(text);
        console.warn(`[i18n] mangler engelsk oversættelse: ${text}`);
      }
    } else out = translated;
  }
  if (vars)
    out = out.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in vars ? String(vars[key]) : match,
    );
  return out;
}

/** Gemt sprogvalg. Uden valg er det dansk: spillet er dansk, og engelsk er et aktivt tilvalg. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === "en" ? "en" : "da";
  } catch {
    return "da";
  }
}

/** Landekode til tal og datoer. */
export const locale = () => (current === "en" ? "en-GB" : "da-DK");

/** Standardnavne til nye spillere og hold i det aktuelle sprog. */
export const playerName = (n: number) =>
  `${current === "en" ? "Player" : "Spiller"} ${n}`;
export const teamName = (n: number) =>
  `${current === "en" ? "Team" : "Hold"} ${n}`;

/** Oversætter et standardnavn («Spiller 2» ↔ «Player 2»); andre navne bevares. */
export function retitleDefaultName(name: string, lang: Lang) {
  const player = name.match(/^(?:Spiller|Player) (\d+)$/);
  if (player) return `${lang === "en" ? "Player" : "Spiller"} ${player[1]}`;
  const team = name.match(/^(?:Hold|Team) (\d+)$/);
  if (team) return `${lang === "en" ? "Team" : "Hold"} ${team[1]}`;
  return name;
}
