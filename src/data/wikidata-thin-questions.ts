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
const excludedAmbiguousOrDuplicateWorkIds = new Set([
  "Q979", // Polonium blev opdaget af bÃ¥de Marie og Pierre Curie.
  "Q1128", // Radium blev isoleret/opdaget af flere forskere sammen.
  "Q143899", // Tandhjulspumpens ophav er for nicheprÃ¦get og kildeafhÃ¦ngigt.
  "Q466", // Dublikerer det hÃ¥ndskrevne spÃ¸rgsmÃ¥l om World Wide Web.
]);
const disabledTemplateKeys = new Set([
  "airport-country",
  "baked-origin",
  "brand-industry",
  "building-architect",
  "car-model-manufacturer",
  "car-model-designer",
  "danish-song-performer",
  "football-club-stadium",
  "philosopher-movement",
  "psychologist-field",
  "scientist-field",
  "space-constellation",
]);
const familiarTemplateWorkIds = new Map<string, Set<string>>([
  [
    "athlete-sport",
    new Set([
      "Q10125",
      "Q1002293",
      "Q1009230",
      "Q100074",
      "Q4262660",
      "Q1000592",
      "Q10118",
      "Q15269",
    ]),
  ],
  [
    "danish-film-director",
    new Set([
      "Q352000",
      "Q374373",
      "Q110365",
      "Q196103",
      "Q327681",
      "Q1630226",
      "Q1327845",
      "Q1482548",
      "Q1253821",
      "Q1423329",
      "Q775356",
      "Q1326419",
      "Q342637",
      "Q165699",
      "Q1245864",
      "Q370707",
      "Q316761",
      "Q1321282",
      "Q1446749",
      "Q312394",
    ]),
  ],
  [
    "danish-literature-author",
    new Set([
      "Q790276",
      "Q1192442",
      "Q1756234",
      "Q11868",
      "Q11859",
      "Q11876",
      "Q1807554",
      "Q11872",
      "Q1152009",
      "Q1757858",
      "Q767189",
      "Q1760337",
      "Q1985244",
      "Q1762814",
      "Q2180740",
      "Q1758876",
      "Q1348207",
      "Q1642629",
      "Q1757820",
      "Q1771634",
      "Q11880",
      "Q1757894",
    ]),
  ],
  [
    "danish-series-creator",
    new Set([
      "Q1211796",
      "Q115173056",
      "Q112270002",
      "Q956446",
      "Q1782870",
      "Q1275157",
      "Q113592299",
      "Q1331994",
      "Q12333582",
      "Q96241173",
    ]),
  ],
  [
    "nordic-mountain-country",
    new Set([
      "Q1018862",
      "Q1420616",
      "Q1496308",
      "Q1547402",
      "Q1477173",
      "Q1315012",
      "Q1637507",
      "Q138114",
    ]),
  ],
]);
const familiarBattleIds = new Set([
  "Q153376",
  "Q16470",
  "Q154182",
  "Q151290",
  "Q38789",
  "Q33132",
  "Q31900",
  "Q27759",
  "Q184320",
  "Q132568",
  "Q131969",
  "Q130847",
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

function applyRelationCopy(
  template: string,
  record: (typeof records)[number],
  answer?: string,
) {
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
    !disabledTemplateKeys.has(record.key) &&
    (!familiarTemplateWorkIds.has(record.key) ||
      familiarTemplateWorkIds.get(record.key)!.has(record.workQid)) &&
    !excludedFormatAdaptations.has(record.workQid) &&
    !excludedAmbiguousOrDuplicateWorkIds.has(record.workQid) &&
    (record.key !== "battle-country" ||
      familiarBattleIds.has(record.workQid)) &&
    (record.key !== "invention-inventor" ||
      allowedDiscoveryOrInventionIds.has(record.workQid)),
);

const inventionOptionOverrides = new Map<string, string[]>([
  ["Q2270", ["August Kekulé", "Justus von Liebig", "Humphry Davy"]],
  ["Q3134", ["Simon Marius", "Johannes Kepler", "Tycho Brahe"]],
  ["Q3143", ["Simon Marius", "Johannes Kepler", "Tycho Brahe"]],
  ["Q3169", ["Simon Marius", "Johannes Kepler", "Tycho Brahe"]],
  ["Q3123", ["Simon Marius", "Johannes Kepler", "Tycho Brahe"]],
  ["Q143", ["Louis de Beaufront", "Charles K. Bliss", "Marc Okrand"]],
  ["Q43484", ["Arthur Schopenhauer", "Søren Kierkegaard", "Martin Heidegger"]],
  ["Q10693", ["Lothar Meyer", "John Newlands", "Antoine Lavoisier"]],
  ["Q2294", ["J.J. Thomson", "James Chadwick", "Niels Bohr"]],
  ["Q144334", ["Bi Sheng", "William Caxton", "Laurens Coster"]],
  ["Q6368", ["Marc Andreessen", "Brendan Eich", "Vint Cerf"]],
]);

function optionsFor(record: (typeof records)[number]) {
  const nordicCountries = ["Danmark", "Finland", "Island", "Norge", "Sverige"];
  const generatedPool = [
    ...new Set(
      usableRecords
        .filter((item) => item.key === record.key)
        .map((item) => item.answer),
    ),
  ].filter((answer) => answer !== record.answer);
  const pool =
    inventionOptionOverrides.get(record.workQid) ??
    (record.key === "nordic-mountain-country"
      ? nordicCountries.filter((answer) => answer !== record.answer)
      : generatedPool);
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
    Q143899: "cat-39",
    Q144334: "cat-39",
    Q6368: "cat-10",
    Q466: "cat-10",
  };
  return categoryOverrides[record.workQid] ?? record.categoryId;
}

const createdAt = "2026-07-16T00:00:00.000Z";

function recordDifficulty(record: (typeof records)[number], index: number) {
  const generated = ((index + record.work.length) % 4) + 2;
  const minimumByTemplate: Record<string, number> = {
    "battle-country": 3,
    "danish-film-director": 3,
    "danish-series-creator": 3,
    "nordic-mountain-country": 4,
  };
  return Math.max(generated, minimumByTemplate[record.key] ?? 2);
}

export const WIKIDATA_THIN_QUESTIONS: Question[] = usableRecords.map(
  (record, index) => {
    const relationOptions = optionsFor(record);
    return {
      id: `wikithin-${record.key}-${record.workQid}`,
      prompt: directPrompt(record),
      type: "multiple_choice",
      categoryId: categoryFor(record),
      secondaryCategoryIds: [],
      difficulty: recordDifficulty(record, index),
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
