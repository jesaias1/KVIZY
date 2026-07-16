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
  (record, index) => {
    const relationOptions = optionsFor(record);
    const variant = index % 10;
    const falseStatement = variant === 0 && index % 20 === 0;
    const options =
      variant === 0
        ? [
            { id: "o1", text: "Sandt" },
            { id: "o2", text: "Falsk" },
          ]
        : variant === 1
          ? relationOptions.map((option) => ({
              ...option,
              text: `${option.text} er registreret som ${record.relation} for ${record.work}.`,
            }))
          : relationOptions;
    const statementAnswer = falseStatement
      ? relationOptions.find((option) => option.id !== "o1")!.text
      : record.answer;
    return {
      id: `wikithin-${record.key}-${record.workQid}`,
      prompt:
        variant === 0
          ? `Sandt eller falsk: ${statementAnswer} er registreret som ${record.relation} for ${record.work}.`
          : variant === 1
            ? `Hvilket udsagn om ${record.work} er korrekt?`
            : record.prompt.replace("{work}", record.work),
      type:
        variant === 0
          ? "true_false"
          : variant === 1
            ? "correct_statement"
            : "multiple_choice",
      categoryId: record.categoryId,
      secondaryCategoryIds: [],
      difficulty: ((index + record.work.length) % 4) + 2,
      options,
      correctOptionId: falseStatement ? "o2" : "o1",
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
    } satisfies Question;
  },
);
