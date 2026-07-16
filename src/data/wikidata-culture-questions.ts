import records from "./wikidata-culture.generated.json";
import { stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

// P112 ("grundlagt af") indeholder også stater, myndigheder, moderselskaber
// og historiske forgængere. Det giver teknisk mulige, men dårlige quizsvar som
// "Israel" eller "Kongressen i USA" på et hvem-spørgsmål, så denne relation
// bruges ikke uden en særskilt redaktionel kontrol.
const usableRecords = records.filter(
  (record) => record.key !== "company-founder",
);

function workLabel(record: (typeof records)[number]) {
  return record.work
    .replace(/\s+/g, " ")
    .replace(/\s*\(final version\)$/i, "")
    .trim();
}

function optionsFor(record: (typeof records)[number]) {
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
