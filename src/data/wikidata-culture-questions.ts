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

const createdAt = "2026-07-16T00:00:00.000Z";

function factSentence(record: (typeof records)[number], answer: string) {
  const facts: Record<string, string> = {
    "film-director": `${answer} instruerede filmen ${record.work}.`,
    "album-artist": `${answer} udgav albummet ${record.work}.`,
    "game-developer": `${answer} udviklede spillet ${record.work}.`,
    "painting-artist": `${answer} skabte maleriet ${record.work}.`,
    "series-creator": `${answer} skabte TV-serien ${record.work}.`,
    "software-developer": `${answer} udviklede softwaren ${record.work}.`,
    "food-origin": `${record.work} forbindes med ${answer} som oprindelsesland.`,
    "company-founder": `${answer} grundlagde virksomheden ${record.work}.`,
  };
  return facts[record.key] ?? `${answer} forbindes med ${record.work}.`;
}

export const WIKIDATA_CULTURE_QUESTIONS: Question[] = records.map(
  (record, index) => {
    const relationOptions = optionsFor(record);
    const trueFalse = index % 15 === 0;
    const falseStatement = trueFalse && index % 30 === 0;
    const statementAnswer = falseStatement
      ? relationOptions.find((option) => option.id !== "o1")!.text
      : record.answer;
    return {
      id: `wikiculture-${record.key}-${record.workQid}`,
      prompt: trueFalse
        ? `Sandt eller falsk: ${factSentence(record, statementAnswer)}`
        : record.prompt.replace("{work}", record.work),
      type: trueFalse ? "true_false" : "multiple_choice",
      categoryId: record.categoryId,
      secondaryCategoryIds: [],
      difficulty: ((index + record.work.length) % 4) + 2,
      options: trueFalse
        ? [
            { id: "o1", text: "Sandt" },
            { id: "o2", text: "Falsk" },
          ]
        : relationOptions,
      correctOptionId: falseStatement ? "o2" : "o1",
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
