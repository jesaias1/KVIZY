import countries from "./wikidata-countries.generated.json";
import { normalizeText, stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

type CountryRecord = (typeof countries)[number];
type Relation =
  "capital" | "currency" | "continent" | "language" | "callingCode" | "tld";

const created = "2026-07-15T00:00:00.000Z";
const familiar = new Set([
  "AR",
  "AU",
  "AT",
  "BE",
  "BR",
  "CA",
  "CN",
  "DK",
  "EG",
  "FI",
  "FR",
  "DE",
  "GR",
  "IS",
  "IN",
  "IE",
  "IT",
  "JP",
  "MX",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "RU",
  "ZA",
  "KR",
  "ES",
  "SE",
  "CH",
  "TR",
  "UA",
  "GB",
  "US",
]);

const relationConfig: Record<
  Relation,
  { categoryId: string; secondary: string[]; bump: number }
> = {
  capital: { categoryId: "cat-6", secondary: ["cat-1"], bump: 0 },
  currency: { categoryId: "cat-1", secondary: ["cat-6", "cat-55"], bump: 1 },
  continent: { categoryId: "cat-6", secondary: ["cat-4"], bump: 0 },
  language: { categoryId: "cat-38", secondary: ["cat-6"], bump: 1 },
  callingCode: { categoryId: "cat-10", secondary: ["cat-6"], bump: 2 },
  tld: { categoryId: "cat-10", secondary: ["cat-6"], bump: 2 },
};

function validValues(country: CountryRecord, relation: Relation) {
  const values = (country[relation] ?? []).filter(
    (value) => value && !/^Q\d+$/i.test(value) && !/^Sprog i\b/i.test(value),
  );
  if (relation === "currency" && values.length > 1) return [];
  if (relation === "tld")
    return values.filter((value) => /^\.[a-z]{2}$/i.test(value));
  return values;
}

function uniqueValues(relation: Relation) {
  return [
    ...new Set(countries.flatMap((country) => validValues(country, relation))),
  ];
}

function plausibleOptions(
  correct: string,
  invalid: string[],
  pool: string[],
  seed: string,
) {
  const correctKey = normalizeText(correct);
  const invalidKeys = new Set(invalid.map(normalizeText));
  const available = pool.filter(
    (value) =>
      normalizeText(value) !== correctKey &&
      !invalidKeys.has(normalizeText(value)),
  );
  const start =
    Number.parseInt(stableHash(seed), 36) % Math.max(1, available.length);
  const picked: string[] = [];
  const pickedKeys = new Set<string>();
  for (let i = 0; picked.length < 3 && i < available.length * 2; i++) {
    const value = available[(start + i) % available.length];
    const key = value ? normalizeText(value) : "";
    if (value && !pickedKeys.has(key)) {
      picked.push(value);
      pickedKeys.add(key);
    }
  }
  return [correct, ...picked].map((text, index) => ({
    id: `o${index + 1}`,
    text,
  }));
}

function level(country: CountryRecord, relation: Relation) {
  const base = familiar.has(country.code)
    ? 1
    : country.continent?.includes("Europa")
      ? 2
      : 3;
  return Math.min(5, base + relationConfig[relation].bump);
}

function wording(country: CountryRecord, relation: Relation, answer: string) {
  const capital = country.capital?.[0];
  const continent = country.continent?.[0];
  switch (relation) {
    case "capital":
      return {
        prompt:
          (country.capital?.length ?? 0) > 1
            ? `Hvilken af disse byer regnes som en hovedstad i ${country.country}?`
            : `Hvad er hovedstaden i ${country.country}?`,
        explanation: `${answer} er hovedstad i ${country.country}${continent ? `, som ligger i ${continent}` : ""}.`,
      };
    case "currency":
      return {
        prompt: `Hvilken valuta bruges i ${country.country}?`,
        explanation: `${country.country} bruger ${answer}${capital ? `. Landets hovedstad er ${capital}` : ""}.`,
      };
    case "continent":
      return {
        prompt: `Hvilken verdensdel ligger ${country.country} i?`,
        explanation: `${country.country} ligger i ${answer}${capital ? ` og har ${capital} som hovedstad` : ""}.`,
      };
    case "language":
      return {
        prompt: `Hvilket af disse er et officielt sprog i ${country.country}?`,
        explanation: `${answer} er et officielt sprog i ${country.country}${continent ? `, der ligger i ${continent}` : ""}.`,
      };
    case "callingCode":
      return {
        prompt: `Hvilken international landekode hører til ${country.country}?`,
        explanation: `${answer} er den internationale landekode for ${country.country}.`,
      };
    case "tld":
      return {
        prompt: `Hvilket nationalt topdomæne hører til ${country.country}?`,
        explanation: `${answer} er ${country.country}s nationale topdomæne på internettet.`,
      };
  }
}

const pools = Object.fromEntries(
  (Object.keys(relationConfig) as Relation[]).map((relation) => [
    relation,
    uniqueValues(relation),
  ]),
) as Record<Relation, string[]>;

export const COUNTRY_QUESTIONS: Question[] = countries.flatMap((country) =>
  (Object.keys(relationConfig) as Relation[]).flatMap((relation) => {
    const answers = validValues(country, relation);
    const answer = answers[0];
    if (!answer) return [];
    const copy = wording(country, relation, answer);
    const config = relationConfig[relation];
    return [
      {
        id: `wd-${country.qid}-${relation}`,
        prompt: copy.prompt,
        type:
          relation === "language" || relation === "tld"
            ? "precise"
            : "multiple_choice",
        categoryId: config.categoryId,
        secondaryCategoryIds: config.secondary,
        difficulty: level(country, relation),
        options: plausibleOptions(
          answer,
          answers.slice(1),
          pools[relation],
          `${country.qid}-${relation}`,
        ),
        correctOptionId: "o1",
        explanation: copy.explanation,
        sourceLabel: "Wikidata (CC0)",
        sourceUrl: `https://www.wikidata.org/wiki/${country.qid}`,
        tags: ["lande", relation, country.country.toLocaleLowerCase("da")],
        origin: "curated",
        status: "active",
        fingerprint: stableHash(`${country.qid}:${relation}:${answer}`),
        qualityScore: 90,
        timeSensitive: false,
        createdAt: created,
        updatedAt: created,
        playCount: 0,
        correctRate: 0,
        reportCount: 0,
      } satisfies Question,
    ];
  }),
);
