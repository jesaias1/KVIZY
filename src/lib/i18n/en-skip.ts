// Spørgsmål, der handler om det danske sprog og derfor ikke kan stilles på
// engelsk. De udelades i engelsk tilstand og i Dagens quiz på begge sprog.
export const EN_SKIP_IDS: ReadonlySet<string> = new Set([
  "format-depth-016",
  "kz-19g2yqe",
  "kz-1afhunk",
  "kz-1hmmogn",
  "kz-1hzsvdx",
  "kz-1iu4yex",
  "kz-1laq42k",
  "kz-1tgq1n3",
  "kz-1vqvbml",
  "kz-8q055j",
  "kz-9w531p",
  "kz-iqlhhl",
  "kz-iry43v",
  "kz-rrqo8x",
  "kz-rzyyix",
  "kz-snwa9g",
  "variety-117",
]);

// Danske kategorier giver ikke mening på engelsk (danske film, politik, musik …)
// og skjules og udelades derfor, når engelsk er valgt.
export const EN_HIDDEN_CATEGORY_IDS: ReadonlySet<string> = new Set([
  "cat-2",
  "cat-3",
  "cat-16",
  "cat-18",
  "cat-20",
  "cat-22",
  "cat-26",
]);

// Spørgsmål i øvrige kategorier, der handler om Danmark i selve spørgsmålet
// eller svarmulighederne (forklaringen tæller ikke med).
const DANISH_TOPIC =
  /danmark|dansk|dansker|københavn|aarhus|århus|odense|aalborg|jylland|sjælland|bornholm|færø|grønland|folketing|tv ?2|matador|tivoli|carlsberg|tuborg|vestas|ørsted|novo nordisk|maersk|mærsk|nationalbank|rigsdaler|kroner?\b|dronning|kong (frederik|christian)|superliga|brøndby|olsen-banden|kim larsen|h\.c\. andersen|kierkegaard|\bnetto\b|\blego\b|smørrebrød|julefrokost|fastelavn|sankt hans|dannebrog/i;

const DANISH_ABBREVIATIONS = /(DR|FCK)/;

type Skippable = {
  id: string;
  categoryId: string;
  prompt: string;
  options: { text: string }[];
};

/** Engelsk tilstand udelader spørgsmål, der kun giver mening for danskere. */
export function isDanishOnly(question: Skippable) {
  if (EN_SKIP_IDS.has(question.id)) return true;
  if (EN_HIDDEN_CATEGORY_IDS.has(question.categoryId)) return true;
  const text = `${question.prompt} ${question.options.map((o) => o.text).join(" ")}`;
  return DANISH_TOPIC.test(text) || DANISH_ABBREVIATIONS.test(text);
}
