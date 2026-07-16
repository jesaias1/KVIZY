import records from "./wikidata-thin.generated.json";
import { stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

const discoveryWorkIds = new Set([
  "Q2270",
  "Q3134",
  "Q3143",
  "Q3169",
  "Q3123",
  "Q979",
  "Q1128",
  "Q2294",
]);
const developmentWorkIds = new Set([
  "Q8548",
  "Q143",
  "Q10693",
  "Q122894",
  "Q43484",
  "Q131246",
  "Q143899",
  "Q144334",
  "Q6368",
  "Q466",
]);
const allowedDiscoveryOrInventionIds = new Set([
  ...discoveryWorkIds,
  ...developmentWorkIds,
]);
const excludedFormatAdaptations = new Set([
  "Q3705475",
  "Q5245862",
  "Q5989452",
  "Q7939619",
  "Q591519",
]);

const relationCopy: Record<string, { prompt: string; fact: string }> = {
  Q2270: {
    prompt: "Hvem opdagede stoffet {work}?",
    fact: "{answer} opdagede stoffet {work}.",
  },
  Q3134: {
    prompt: "Hvem opdagede Jupiters måne {work} i 1610?",
    fact: "{answer} opdagede Jupiters måne {work} i 1610.",
  },
  Q3143: {
    prompt: "Hvem opdagede Jupiters måne {work} i 1610?",
    fact: "{answer} opdagede Jupiters måne {work} i 1610.",
  },
  Q3169: {
    prompt: "Hvem opdagede Jupiters måne {work} i 1610?",
    fact: "{answer} opdagede Jupiters måne {work} i 1610.",
  },
  Q3123: {
    prompt: "Hvem opdagede Jupiters måne {work} i 1610?",
    fact: "{answer} opdagede Jupiters måne {work} i 1610.",
  },
  Q979: {
    prompt: "Hvem opdagede grundstoffet {work}?",
    fact: "{answer} opdagede grundstoffet {work}.",
  },
  Q1128: {
    prompt: "Hvem opdagede grundstoffet {work}?",
    fact: "{answer} opdagede grundstoffet {work}.",
  },
  Q2294: {
    prompt: "Hvem forbindes med opdagelsen af {work}?",
    fact: "{answer} forbindes med opdagelsen af {work}.",
  },
  Q8548: {
    prompt: "Hvem udviklede algoritmen {work}?",
    fact: "{answer} udviklede algoritmen {work}.",
  },
  Q143: {
    prompt: "Hvem skabte sproget {work}?",
    fact: "{answer} skabte sproget {work}.",
  },
  Q10693: {
    prompt: "Hvem opstillede det {work}?",
    fact: "{answer} opstillede det {work}.",
  },
  Q122894: {
    prompt: "Hvem introducerede {work}?",
    fact: "{answer} introducerede {work}.",
  },
  Q43484: {
    prompt: "Hvilken filosof forbindes med begrebet {work}?",
    fact: "{answer} forbindes med begrebet {work}.",
  },
  Q131246: {
    prompt: "Hvem introducerede begrebet {work}?",
    fact: "{answer} introducerede begrebet {work}.",
  },
  Q143899: {
    prompt: "Hvem forbindes med opfindelsen af {work}?",
    fact: "{answer} forbindes med opfindelsen af {work}.",
  },
  Q144334: {
    prompt: "Hvem forbindes med udviklingen af den europæiske {work}?",
    fact: "{answer} forbindes med udviklingen af den europæiske {work}.",
  },
  Q6368: {
    prompt: "Hvem udviklede den første {work}?",
    fact: "{answer} udviklede den første {work}.",
  },
  Q466: {
    prompt: "Hvem opfandt {work}?",
    fact: "{answer} opfandt {work}.",
  },
};

function applyRelationCopy(template: string, record: (typeof records)[number], answer?: string) {
  return template
    .replace("{work}", record.work)
    .replace("{answer}", answer ?? record.answer);
}

const usableKeys = new Set(
  [...Map.groupBy(records, (record) => record.key).entries()]
    .filter(([, items]) => new Set(items.map((item) => item.answer)).size >= 4)
    .map(([key]) => key),
);
const usableRecords = records.filter(
  (record) =>
    usableKeys.has(record.key) &&
    !excludedFormatAdaptations.has(record.workQid) &&
    (record.key !== "invention-inventor" ||
      allowedDiscoveryOrInventionIds.has(record.workQid)),
);

function optionsFor(record: (typeof records)[number]) {
  const pool = [
    ...new Set(
      usableRecords
        .filter((item) => item.key === record.key)
        .map((item) => item.answer),
    ),
  ].filter((answer) => answer !== record.answer);
  const start =
    Number.parseInt(stableHash(`${record.key}:${record.workQid}`), 36) %
    pool.length;
  const distractors: string[] = [];
  for (let index = 0; distractors.length < 3 && index < pool.length; index++) {
    const answer = pool[(start + index) % pool.length];
    if (answer && !distractors.includes(answer)) distractors.push(answer);
  }
  return [record.answer, ...distractors].map((text, index) => ({
    id: `o${index + 1}`,
    text,
  }));
}

function directPrompt(record: (typeof records)[number]) {
  if (record.workQid === "Q215023")
    return "Hvem var den første domkirkearkitekt under restaureringen af Nidarosdomen?";
  const prompts: Partial<Record<string, string>> = {
    "danish-film-director": `Hvem instruerede filmen ${record.work}?`,
    "danish-series-creator": `Hvem skabte TV-serien ${record.work}?`,
    "building-architect": `Hvem er arkitekten bag ${record.work}?`,
    "car-model-designer": `Hvem designede bilmodellen ${record.work}?`,
    "invention-inventor": `Hvem forbindes med opfindelsen af ${record.work}?`,
  };
  if (record.key === "battle-country") {
    const event = /\bslag(?:et)?\b/i.test(record.work)
      ? `${record.work[0].toLocaleLowerCase("da")}${record.work.slice(1)}`
      : `slaget ved ${record.work}`;
    return `I hvilket land fandt ${event} sted?`;
  }
  if (record.key === "invention-inventor") {
    const copy = relationCopy[record.workQid];
    if (copy) return applyRelationCopy(copy.prompt, record);
    if (discoveryWorkIds.has(record.workQid))
      return `Hvem forbindes med opdagelsen af ${record.work}?`;
    return `Hvem forbindes med udviklingen af ${record.work}?`;
  }
  return prompts[record.key] ?? record.prompt.replace("{work}", record.work);
}

function factSentence(record: (typeof records)[number], answer: string) {
  if (record.workQid === "Q215023")
    return `${answer} var den første domkirkearkitekt under restaureringen af Nidarosdomen.`;
  const facts: Partial<Record<string, string>> = {
    "airport-country": `${record.work} ligger i ${answer}.`,
    "athlete-sport": `${record.work} forbindes med ${answer}.`,
    "baked-origin": `${record.work} stammer fra ${answer}.`,
    "brand-industry": `${record.work} forbindes primært med ${answer}.`,
    "building-architect": `${answer} er arkitekten bag ${record.work}.`,
    "car-model-designer": `${answer} designede bilmodellen ${record.work}.`,
    "car-model-manufacturer": `${answer} fremstiller bilmodellen ${record.work}.`,
    "cocktail-origin": `${record.work} forbindes med ${answer}.`,
    "danish-film-director": `${answer} instruerede filmen ${record.work}.`,
    "danish-literature-author": `${answer} skrev værket ${record.work}.`,
    "danish-series-creator": `${answer} skabte TV-serien ${record.work}.`,
    "danish-song-performer": `${answer} fremførte ${record.work}.`,
    "football-club-stadium": `${record.work} spiller sine hjemmekampe på ${answer}.`,
    "invention-inventor": `${answer} forbindes med opfindelsen af ${record.work}.`,
    "nordic-author-country": `${record.work} kom fra ${answer}.`,
    "nordic-mountain-country": `${record.work} ligger i ${answer}.`,
    "philosopher-movement": `${record.work} forbindes med ${answer}.`,
    "psychologist-field": `${record.work} forbindes især med ${answer}.`,
    "scientist-field": `${record.work} forbindes især med ${answer}.`,
    "space-constellation": `${record.work} ligger i stjernebilledet ${answer}.`,
  };
  if (record.key === "battle-country") {
    const event = /\bslag(?:et)?\b/i.test(record.work)
      ? record.work
      : `Slaget ved ${record.work}`;
    return `${event} fandt sted i ${answer}.`;
  }
  if (record.key === "invention-inventor") {
    const copy = relationCopy[record.workQid];
    if (copy) return applyRelationCopy(copy.fact, record, answer);
    if (discoveryWorkIds.has(record.workQid))
      return `${answer} forbindes med opdagelsen af ${record.work}.`;
    return `${answer} forbindes med udviklingen af ${record.work}.`;
  }
  return facts[record.key] ?? `${answer} forbindes med ${record.work}.`;
}

function categoryFor(record: (typeof records)[number]) {
  const categoryOverrides: Record<string, string> = {
    Q3134: "cat-8",
    Q3143: "cat-8",
    Q3169: "cat-8",
    Q3123: "cat-8",
    Q2270: "cat-7",
    Q979: "cat-7",
    Q1128: "cat-7",
    Q2294: "cat-7",
    Q8548: "cat-9",
    Q143: "cat-38",
    Q10693: "cat-7",
    Q122894: "cat-7",
    Q43484: "cat-11",
    Q131246: "cat-13",
    Q143899: "cat-39",
    Q144334: "cat-39",
    Q6368: "cat-10",
    Q466: "cat-10",
  };
  return categoryOverrides[record.workQid] ?? record.categoryId;
}

const createdAt = "2026-07-16T00:00:00.000Z";
export const WIKIDATA_THIN_QUESTIONS: Question[] = usableRecords.map(
  (record, index) => {
    const relationOptions = optionsFor(record);
    return {
      id: `wikithin-${record.key}-${record.workQid}`,
      prompt: directPrompt(record),
      type: "multiple_choice",
      categoryId: categoryFor(record),
      secondaryCategoryIds: [],
      difficulty: ((index + record.work.length) % 4) + 2,
      options: relationOptions,
      correctOptionId: "o1",
      explanation: factSentence(record, record.answer),
      sourceLabel:
        record.workQid === "Q215023"
          ? "Store norske leksikon"
          : "Wikidata (CC0)",
      sourceUrl:
        record.workQid === "Q215023"
          ? "https://snl.no/Nidaros_Domkirkes_Restaureringsarbeider"
          : `https://www.wikidata.org/wiki/${record.workQid}`,
      tags: ["wikidata", record.key],
      origin: "curated",
      status: "active",
      fingerprint: stableHash(
        `thin:${record.key}:${record.workQid}:${record.answerQid}`,
      ),
      qualityScore: 91,
      timeSensitive: false,
      createdAt,
      updatedAt: createdAt,
      playCount: 0,
      correctRate: 0,
      reportCount: 0,
    } satisfies Question;
  },
);
