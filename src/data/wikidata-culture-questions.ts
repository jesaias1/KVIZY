import records from "./wikidata-culture.generated.json";
import { stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

// P112 ("grundlagt af") indeholder også stater, myndigheder, moderselskaber
// og historiske forgængere. Det giver teknisk mulige, men dårlige quizsvar som
// "Israel" eller "Kongressen i USA" på et hvem-spørgsmål, så denne relation
// bruges ikke uden en særskilt redaktionel kontrol.
const familiarFilmIds = new Set([
  "Q2201", "Q2345", "Q19355", "Q19405", "Q20456", "Q4430", "Q22432",
  "Q23395", "Q32303", "Q4536", "Q4941", "Q6074", "Q32433", "Q5890",
  "Q59610", "Q59653", "Q59534", "Q11618", "Q11621", "Q45394", "Q14320",
  "Q45602", "Q12018", "Q17738", "Q34414", "Q74958", "Q60072", "Q24075",
]);
const familiarPaintingIds = new Set([
  "Q1061035", "Q1065493", "Q106522623", "Q1091086", "Q1169395",
  "Q1170315", "Q1142058", "Q1167178", "Q118469029", "Q12011341",
  "Q1219263", "Q12334558", "Q1239950", "Q1245388", "Q124356656",
  "Q12418", "Q152509", "Q151047", "Q152867", "Q16324087", "Q1659469",
  "Q16333797", "Q16965482", "Q167605", "Q175036",
]);

const usableRecords = records.filter((record) => {
  if (record.key === "company-founder") return false;
  if (record.key === "film-director") return familiarFilmIds.has(record.workQid);
  if (record.key === "painting-artist")
    return familiarPaintingIds.has(record.workQid);
  return true;
});

function workLabel(record: (typeof records)[number]) {
  return record.work
    .replace(/\s+/g, " ")
    .replace(/\s*\(final version\)$/i, "")
    .trim();
}

function optionsFor(record: (typeof records)[number]) {
  if (record.key === "food-origin" && record.workQid === "Q493749") {
    return ["Danmark", "Sverige", "Norge", "Finland"].map((text, index) => ({
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
      difficulty: ((index + record.work.length) % 4) + 2,
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
