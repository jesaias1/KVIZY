import type { Question } from "../types";

// Engelske spørgsmål ligger i public/i18n/questions.en.json og hentes først,
// når engelsk vælges. Spørgsmålene vælges stadig på dansk (så Dagens quiz og
// «set før»-historikken er ens på tværs af sprog); først derefter byttes
// teksterne ud med de oversatte.

export type EnglishQuestion = { p: string; o: string[]; e: string };
export type EnglishPack = {
  v: string;
  skip: string[];
  q: Record<string, EnglishQuestion>;
};

export const ENGLISH_PACK_URL = "/i18n/questions.en.json";

/** Skifter tekster til engelsk. Spørgsmål uden oversættelse beholdes på dansk. */
export function localizeQuestion(
  question: Question,
  pack: EnglishPack | null,
): Question {
  const translated = pack?.q[question.id];
  if (!translated || translated.o.length !== question.options.length)
    return question;
  return {
    ...question,
    prompt: translated.p,
    explanation: translated.e,
    options: question.options.map((option, index) => ({
      ...option,
      text: translated.o[index],
    })),
  };
}

export const localizeQuestions = (
  questions: Question[],
  pack: EnglishPack | null,
) => (pack ? questions.map((q) => localizeQuestion(q, pack)) : questions);
