import records from "./wikidata-culture.generated.json";
import { stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

// P112 ("grundlagt af") indeholder også stater, myndigheder, moderselskaber
// og historiske forgængere. Det giver teknisk mulige, men dårlige quizsvar som
// "Israel" eller "Kongressen i USA" på et hvem-spørgsmål, så denne relation
// bruges ikke uden en særskilt redaktionel kontrol.
const familiarFilmIds = new Set([
  "Q2201",
  "Q2345",
  "Q19355",
  "Q19405",
  "Q20456",
  "Q4430",
  "Q22432",
  "Q23395",
  "Q32303",
  "Q4536",
  "Q4941",
  "Q6074",
  "Q32433",
  "Q5890",
  "Q59610",
  "Q59653",
  "Q59534",
  "Q11618",
  "Q11621",
  "Q45394",
  "Q14320",
  "Q45602",
  "Q12018",
  "Q17738",
  "Q34414",
  "Q74958",
  "Q60072",
  "Q24075",
]);
const familiarPaintingIds = new Set([
  "Q1061035",
  "Q1065493",
  "Q1091086",
  "Q1170315",
  "Q1142058",
  "Q1219263",
  "Q12334558",
  "Q1239950",
  "Q1245388",
  "Q12418",
  "Q151047",
  "Q175036",
]);
const familiarAlbumIds = new Set([
  "Q45367",
  "Q127503",
  "Q128017",
  "Q45727",
  "Q11632",
  "Q8360",
  "Q27166",
  "Q13171",
  "Q13172",
  "Q15661",
  "Q129684",
  "Q109214",
  "Q17444",
  "Q113189",
  "Q131182",
  "Q131392",
  "Q131977",
  "Q117225",
  "Q19003",
  "Q58761",
]);
const familiarSeriesIds = new Set([
  "Q35791",
  "Q1077",
  "Q1079",
  "Q216919",
  "Q183513",
  "Q186219",
  "Q189068",
  "Q189350",
  "Q276180",
  "Q2744",
  "Q3013",
  "Q193462",
  "Q11622",
  "Q13979",
  "Q16290",
  "Q80044",
  "Q283393",
  "Q199853",
]);
const familiarFoodIds = new Set([
  "Q203925",
  "Q275621",
  "Q493749",
  "Q920940",
  "Q85772622",
]);

const usableRecords = records.filter((record) => {
  if (
    ["company-founder", "game-developer", "software-developer"].includes(
      record.key,
    )
  )
    return false;
  if (record.key === "film-director")
    return familiarFilmIds.has(record.workQid);
  if (record.key === "painting-artist")
    return familiarPaintingIds.has(record.workQid);
  if (record.key === "album-artist")
    return familiarAlbumIds.has(record.workQid);
  if (record.key === "series-creator")
    return familiarSeriesIds.has(record.workQid);
  if (record.key === "food-origin") return familiarFoodIds.has(record.workQid);
  return true;
});

function workLabel(record: (typeof records)[number]) {
  return record.work
    .replace(/\s+/g, " ")
    .replace(/\s*\(final version\)$/i, "")
    .trim();
}

function optionsFor(record: (typeof records)[number]) {
  const foodOptions: Record<string, string[]> = {
    Q203925: ["England", "Skotland", "Irland", "Belgien"],
    Q275621: ["Danmark", "Sverige", "Norge", "Finland"],
    Q493749: ["Danmark", "Sverige", "Norge", "Finland"],
    Q920940: ["Indien", "Sri Lanka", "Pakistan", "Bangladesh"],
    Q85772622: ["Danmark", "Tyskland", "Østrig", "Nederlandene"],
  };
  if (record.key === "food-origin" && foodOptions[record.workQid]) {
    return foodOptions[record.workQid].map((text, index) => ({
      id: `o${index + 1}`,
      text,
    }));
  }
  const pool = [
    ...new Set(
      usableRecords
        .filter((item) => item.key === record.key)
        .map((item) => item.answer),
    ),
  ].filter((answer) => answer !== record.answer);
  const start = Number.parseInt(stableHash(record.workQid), 36) % pool.length;
  const distractors: string[] = [];
  for (let i = 0; distractors.length < 3 && i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length];
    if (candidate && !distractors.includes(candidate))
      distractors.push(candidate);
  }
  return [record.answer, ...distractors].map((text, index) => ({
    id: `o${index + 1}`,
    text,
  }));
}

const createdAt = "2026-07-16T00:00:00.000Z";

function difficultyFor(record: (typeof records)[number], index: number) {
  const generated = ((index + record.work.length) % 4) + 2;
  const minimumByTemplate: Record<string, number> = {
    "album-artist": 3,
    "film-director": 3,
    "painting-artist": 4,
    "series-creator": 3,
  };
  return Math.max(generated, minimumByTemplate[record.key] ?? 2);
}

function factSentence(record: (typeof records)[number], answer: string) {
  const work = workLabel(record);
  const facts: Record<string, string> = {
    "film-director": `${answer} instruerede filmen ${work}.`,
    "album-artist": `${answer} udgav albummet ${work}.`,
    "game-developer": `${answer} udviklede spillet ${work}.`,
    "painting-artist": `${answer} skabte maleriet ${work}.`,
    "series-creator": `${answer} skabte TV-serien ${work}.`,
    "software-developer": `${answer} udviklede softwaren ${work}.`,
    "food-origin": `${work} forbindes med ${answer} som oprindelsesland.`,
  };
  return facts[record.key] ?? `${answer} forbindes med ${work}.`;
}

export const WIKIDATA_CULTURE_QUESTIONS: Question[] = usableRecords.map(
  (record, index) => {
    const relationOptions = optionsFor(record);
    return {
      id: `wikiculture-${record.key}-${record.workQid}`,
      prompt: record.prompt.replace("{work}", workLabel(record)),
      type: "multiple_choice",
      categoryId: record.categoryId,
      secondaryCategoryIds: [],
      difficulty: difficultyFor(record, index),
      options: relationOptions,
      correctOptionId: "o1",
      explanation: factSentence(record, record.answer),
      sourceLabel: "Wikidata (CC0)",
      sourceUrl: `https://www.wikidata.org/wiki/${record.workQid}`,
      tags: ["wikidata", record.key],
      origin: "curated",
      status: "active",
      fingerprint: stableHash(
        `${record.key}:${record.workQid}:${record.answerQid}`,
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
