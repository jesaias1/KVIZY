import records from "./wikidata-culture.generated.json";
import { stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

function optionsFor(record: (typeof records)[number]) {
  const pool = [
    ...new Set(
      records
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

const relationCopy: Record<string, string> = {
  "film-director": "instruktør",
  "novel-author": "forfatter",
  "album-artist": "udøvende kunstner",
  "game-developer": "udvikler",
  "painting-artist": "kunstner",
  "series-creator": "skaber",
  "software-developer": "udvikler",
  "food-origin": "oprindelsesland",
  "company-founder": "grundlægger",
  "spacecraft-manufacturer": "producent",
};

const createdAt = "2026-07-16T00:00:00.000Z";

export const WIKIDATA_CULTURE_QUESTIONS: Question[] = records.map(
  (record, index) => ({
    id: `wikiculture-${record.key}-${record.workQid}`,
    prompt: record.prompt.replace("{work}", record.work),
    type: "multiple_choice",
    categoryId: record.categoryId,
    secondaryCategoryIds: [],
    difficulty: ((index + record.work.length) % 4) + 2,
    options: optionsFor(record),
    correctOptionId: "o1",
    explanation: `${record.answer} er registreret som ${relationCopy[record.key]} for ${record.work}.`,
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
  }),
);
