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

function directPrompt(record: (typeof records)[number]) {
  if (record.workQid === "Q215023")
    return "Hvem var den første domkirkearkitekt under restaureringen af Nidarosdomen?";
  const prompts: Partial<Record<string, string>> = {
    "building-architect": `Hvem er arkitekten bag ${record.work}?`,
    "car-model-designer": `Hvem designede bilmodellen ${record.work}?`,
    "invention-inventor": `Hvem forbindes med opfindelsen af ${record.work}?`,
  };
  return prompts[record.key] ?? record.prompt.replace("{work}", record.work);
}

function factSentence(record: (typeof records)[number], answer: string) {
  if (record.workQid === "Q215023")
    return `${answer} var den første domkirkearkitekt under restaureringen af Nidarosdomen.`;
  const facts: Partial<Record<string, string>> = {
    "airport-country": `${record.work} ligger i ${answer}.`,
    "athlete-sport": `${record.work} forbindes med ${answer}.`,
    "baked-origin": `${record.work} stammer fra ${answer}.`,
    "battle-country": `Slaget ved ${record.work} fandt sted i ${answer}.`,
    "brand-industry": `${record.work} forbindes primært med ${answer}.`,
    "building-architect": `${answer} er arkitekten bag ${record.work}.`,
    "car-model-designer": `${answer} designede bilmodellen ${record.work}.`,
    "car-model-manufacturer": `${answer} fremstiller bilmodellen ${record.work}.`,
    "cocktail-origin": `${record.work} forbindes med ${answer}.`,
    "danish-film-director": `${answer} instruerede den danske film ${record.work}.`,
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
  return facts[record.key] ?? `${answer} forbindes med ${record.work}.`;
}

const createdAt = "2026-07-16T00:00:00.000Z";
export const WIKIDATA_THIN_QUESTIONS: Question[] = usableRecords.map(
  (record, index) => {
    const relationOptions = optionsFor(record);
    const trueFalse = index % 14 === 0;
    const falseStatement = trueFalse && index % 28 === 0;
    const statementAnswer = falseStatement
      ? relationOptions.find((option) => option.id !== "o1")!.text
      : record.answer;
    const options = trueFalse
      ? [
          { id: "o1", text: "Sandt" },
          { id: "o2", text: "Falsk" },
        ]
      : relationOptions;
    return {
      id: `wikithin-${record.key}-${record.workQid}`,
      prompt: trueFalse
        ? `Sandt eller falsk: ${factSentence(record, statementAnswer)}`
        : directPrompt(record),
      type: trueFalse ? "true_false" : "multiple_choice",
      categoryId: record.categoryId,
      secondaryCategoryIds: [],
      difficulty: ((index + record.work.length) % 4) + 2,
      options,
      correctOptionId: falseStatement ? "o2" : "o1",
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
