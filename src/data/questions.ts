import { CATEGORIES } from "@/lib/categories";
import { fingerprint } from "@/lib/engine";
import type { Question, QuestionType } from "@/lib/types";
import { COUNTRY_QUESTIONS } from "./country-questions";
import { MUSIC_PRODUCTION_QUESTIONS } from "./music-production-questions";
import { WIKIDATA_CULTURE_QUESTIONS } from "./wikidata-culture-questions";
import { EXPANSION_QUESTIONS } from "./expansion-questions";
import { WIKIDATA_THIN_QUESTIONS } from "./wikidata-thin-questions";
import { VARIETY_QUESTIONS } from "./variety-questions";
import { seedSpecs } from "./seed-spec";

const created = "2026-07-15T00:00:00.000Z";
const rows = seedSpecs.flatMap((spec) =>
  spec.items.map(([prompt, answer]) => ({
    categoryId: spec.categoryId,
    prompt,
    answer,
  })),
);

const overrides: Record<string, string[]> = {
  "Hvilket grundstof har det kemiske symbol Au?": ["Sølv", "Kobber", "Jern"],
  "Hvor mange sider har en regulær sekskant?": ["5", "7", "8"],
  "Hvad kaldes verdens største ocean?": [
    "Atlanterhavet",
    "Det Indiske Ocean",
    "Ishavet",
  ],
  "Hvilket organ pumper blod rundt i kroppen?": [
    "Hjernen",
    "Leveren",
    "Lungerne",
  ],
  "Hvad er hovedstaden i Canada?": ["Toronto", "Vancouver", "Montréal"],
  "Hvilken farve får man ved at blande blå og gul?": [
    "Lilla",
    "Orange",
    "Brun",
  ],
};

const explanationOverrides: Record<string, string> = {
  "Hvilket grundstof har det kemiske symbol Au?":
    "Au kommer af det latinske navn aurum. Guld er et ædelmetal, som næsten ikke reagerer med luft eller vand.",
  "Hvor mange sider har en regulær sekskant?":
    "En regulær sekskant har seks lige lange sider og seks lige store vinkler på 120 grader.",
  "Hvad kaldes verdens største ocean?":
    "Stillehavet er større end alle Jordens landområder tilsammen og dækker omkring en tredjedel af planetens overflade.",
  "Hvilket organ pumper blod rundt i kroppen?":
    "Hjertet er en muskelpumpe med fire kamre, der sender blod gennem både lunge- og kropskredsløbet.",
  "Hvad er hovedstaden i Canada?":
    "Ottawa blev valgt som Canadas hovedstad i 1857; Toronto er landets største by, men ikke hovedstaden.",
  "Hvilken farve får man ved at blande blå og gul?":
    "I traditionel farveblanding giver blå og gul grøn, fordi pigmenterne tilsammen absorberer andre dele af lyset.",
};

function semanticKey(prompt: string, categoryId: string, answer: string) {
  if (
    /^\d+(?:[,.]\d+)?(?:\s|$)/.test(answer) ||
    /^(Hvor mange|Hvor lang|Hvilket år)/i.test(prompt)
  )
    return "tal";
  if (/^Hvem\b/i.test(prompt)) return `${categoryId}:person`;
  const match = prompt.match(
    /^Hvilke[nrt]?\s+(land|by|film|serie|roman|bog|planet|måne|dyr|fugl|sport|instrument|valuta|farve|træ|ost|drue|cocktail|brand|virksomhed|platform|spil|band|gruppe|sanger|kunstner|filosof|psykolog|gud|helt|opfindelse|teknologi|institution|myndighed|flod|ørken|stræde|pest|fred|genre|stil|retning|teori|partikel|kraft|vitamin)/i,
  );
  if (match) return match[1].toLocaleLowerCase("da");
  const opening = prompt.match(
    /^(Hvad (?:hedder|kaldes|er|betyder|gør|beskriver|måler|undersøger|består)|Hvor (?:ligger|stammer))/i,
  )?.[1];
  return `${categoryId}:${opening?.toLocaleLowerCase("da") ?? prompt.split(" ")[0]}`;
}

function numericDistractors(answer: string) {
  const match = answer.match(/^(\d+(?:[,.]\d+)?)(.*)$/);
  if (!match) return [];
  const decimal = match[1].includes(",")
    ? ","
    : match[1].includes(".")
      ? "."
      : "";
  const value = Number(match[1].replace(",", "."));
  const suffix = match[2];
  const deltas =
    value >= 1000 ? [-10, 10, 20] : value > 40 ? [-5, 5, 10] : [-1, 1, 2];
  return deltas.map((delta) => {
    const next = Math.max(0, value + delta);
    const formatted = decimal
      ? next.toFixed(match[1].split(decimal)[1].length).replace(".", decimal)
      : String(next);
    return `${formatted}${suffix}`;
  });
}

function listedOptions(prompt: string, type: QuestionType) {
  const list = prompt
    .split(":")
    .slice(1)
    .join(":")
    .replace(/[?.!]$/, "")
    .trim();
  if (type === "odd_one_out")
    return list
      .replace(/ eller /i, ", ")
      .split(",")
      .map((x) => x.trim());
  if (type === "what_came_first")
    return list.split(/ eller /i).map((x) => x.trim());
  return [];
}

function optionsFor(
  prompt: string,
  correct: string,
  categoryId: string,
  type: QuestionType,
) {
  if (type === "true_false") return ["Sandt", "Falsk"];
  const listed = listedOptions(prompt, type);
  if (listed.length >= 2) return listed;
  const numeric = numericDistractors(correct);
  if (numeric.length) return [correct, ...numeric];
  const key = semanticKey(prompt, categoryId, correct);
  const candidates = [
    ...(overrides[prompt] ?? []),
    ...rows
      .filter(
        (row) =>
          row.answer !== correct &&
          semanticKey(row.prompt, row.categoryId, row.answer) === key,
      )
      .map((row) => row.answer),
    ...rows
      .filter(
        (row) =>
          row.answer !== correct &&
          row.categoryId === categoryId &&
          row.prompt.split(" ")[0] === prompt.split(" ")[0],
      )
      .map((row) => row.answer),
    ...rows
      .filter((row) => row.answer !== correct && row.categoryId === categoryId)
      .map((row) => row.answer),
  ];
  return [correct, ...new Set(candidates)].slice(0, 4);
}

const CURATED_QUESTIONS: Question[] = seedSpecs.flatMap((spec) =>
  spec.items.map((item, index) => {
    const [prompt, correct, detail] = item;
    const type: QuestionType =
      spec.categoryId === "cat-47"
        ? "true_false"
        : spec.categoryId === "cat-45"
          ? "what_came_first"
          : spec.categoryId === "cat-46"
            ? "odd_one_out"
            : "multiple_choice";
    const texts = optionsFor(prompt, correct, spec.categoryId, type);
    const correctIndex = texts.findIndex(
      (text) =>
        text.toLocaleLowerCase("da") === correct.toLocaleLowerCase("da"),
    );
    const options = texts.map((text, optionIndex) => ({
      id: `o${optionIndex + 1}`,
      text,
    }));
    return {
      id: `q-${spec.categoryId}-${index + 1}`,
      prompt,
      type,
      categoryId: spec.categoryId,
      secondaryCategoryIds: [],
      difficulty: ((Number(spec.categoryId.slice(4)) + index * 2) % 5) + 1,
      options,
      correctOptionId: `o${correctIndex + 1}`,
      explanation:
        detail ??
        explanationOverrides[prompt] ??
        `Det korrekte svar er ${correct}. Det er den centrale sammenhæng, spørgsmålet tester.`,
      sourceLabel: "KVIZY redaktionel seedbank",
      tags: [
        CATEGORIES.find(
          (category) => category.id === spec.categoryId,
        )?.name.toLocaleLowerCase("da") ?? "quiz",
      ],
      origin: "curated",
      status: "active",
      fingerprint: fingerprint(prompt, correct, type),
      qualityScore: 92,
      timeSensitive: spec.categoryId === "cat-53",
      createdAt: created,
      updatedAt: created,
      playCount: 0,
      correctRate: 0,
      reportCount: 0,
    } satisfies Question;
  }),
);

export const SEED_QUESTIONS: Question[] = [
  ...CURATED_QUESTIONS,
  ...COUNTRY_QUESTIONS,
  ...MUSIC_PRODUCTION_QUESTIONS,
  ...WIKIDATA_CULTURE_QUESTIONS,
  ...EXPANSION_QUESTIONS,
  ...WIKIDATA_THIN_QUESTIONS,
  ...VARIETY_QUESTIONS,
];
