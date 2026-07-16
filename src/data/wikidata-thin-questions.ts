import records from "./wikidata-thin.generated.json";
import { stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

const usableKeys = new Set(
  [...Map.groupBy(records, (record) => record.key).entries()]
    .filter(([, items]) => new Set(items.map((item) => item.answer)).size >= 4)
    .map(([key]) => key),
);
const usableRecords = records.filter((record) => usableKeys.has(record.key));

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

const createdAt = "2026-07-16T00:00:00.000Z";
export const WIKIDATA_THIN_QUESTIONS: Question[] = usableRecords.map(
  (record, index) => ({
    id: `wikithin-${record.key}-${record.workQid}`,
    prompt: record.prompt.replace("{work}", record.work),
    type: "multiple_choice",
    categoryId: record.categoryId,
    secondaryCategoryIds: [],
    difficulty: ((index + record.work.length) % 4) + 2,
    options: optionsFor(record),
    correctOptionId: "o1",
    explanation: `${record.answer} er registreret som ${record.relation} for ${record.work}.`,
    sourceLabel: "Wikidata (CC0)",
    sourceUrl: `https://www.wikidata.org/wiki/${record.workQid}`,
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
  }),
);
