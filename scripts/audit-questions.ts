import { SEED_QUESTIONS } from "../src/data/questions";
import { CATEGORIES } from "../src/lib/categories";
import { normalizeText } from "../src/lib/engine";
import { hasAnswerLeak } from "../src/lib/question-quality";
import { questionSchema } from "../src/lib/types";

const promptKeys = SEED_QUESTIONS.map((question) =>
  normalizeText(question.prompt),
);
const invalid = SEED_QUESTIONS.filter(
  (question) => !questionSchema.safeParse(question).success,
);
const duplicateOptions = SEED_QUESTIONS.filter((question) => {
  const keys = question.options.map((option) => normalizeText(option.text));
  return new Set(keys).size !== keys.length;
});
const machineCopy = SEED_QUESTIONS.filter((question) =>
  [
    question.prompt,
    question.explanation,
    ...question.options.map((option) => option.text),
  ].some(
    (text) =>
      /registreret som|centrale sammenhæng|final version|slaget ved\s+slaget ved|\s{2,}|\.\./i.test(
        text,
      ) || /Ã.|Â.|â[€™“”–—]/.test(text),
  ),
);
const lowercaseOptions = SEED_QUESTIONS.filter((question) =>
  question.options.some(
    (option) =>
      /^\p{Ll}/u.test(option.text) &&
      !/^(iPhone|iPad|iOS|iPod|eBay|macOS)\b/.test(option.text),
  ),
);
const answerLeaks = SEED_QUESTIONS.filter(hasAnswerLeak);
const obviousCountryAnswers = SEED_QUESTIONS.filter((question) => {
  if (!/-(capital|currency|language)$/.test(question.id)) return false;
  const country = question.tags[2];
  const answer = question.options.find(
    (option) => option.id === question.correctOptionId,
  )?.text;
  if (!country || !answer) return false;
  const countryWords = normalizeText(country).split(" ");
  const answerWords = normalizeText(answer).split(" ");
  return countryWords.some((countryWord) =>
    answerWords.some((answerWord) => {
      const limit = Math.min(countryWord.length, answerWord.length);
      let shared = 0;
      while (shared < limit && countryWord[shared] === answerWord[shared])
        shared++;
      return shared >= (question.id.endsWith("-language") ? 4 : 5);
    }),
  );
});
const thinCategories = CATEGORIES.filter(
  (category) =>
    SEED_QUESTIONS.filter(
      (question) =>
        question.categoryId === category.id ||
        question.secondaryCategoryIds.includes(category.id),
    ).length < 10,
);
const explanatoryCuriosity = SEED_QUESTIONS.filter((question) =>
  question.tags.includes("hverdagsforklaring"),
);
const explanatoryCorrectLongest = explanatoryCuriosity.filter((question) => {
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  const otherLengths = question.options
    .filter((option) => option.id !== question.correctOptionId)
    .map((option) => option.text.length);
  return Boolean(correct && correct.text.length > Math.max(...otherLengths));
});
const explanatoryLengthOutliers = explanatoryCuriosity.filter((question) => {
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  const otherLengths = question.options
    .filter((option) => option.id !== question.correctOptionId)
    .map((option) => option.text.length);
  return Boolean(
    correct && correct.text.length > Math.max(...otherLengths) * 1.15,
  );
});
const fourOptionQuestions = SEED_QUESTIONS.filter(
  (question) => question.options.length === 4 && question.correctOptionId,
);
const correctIsLongest = (question: (typeof SEED_QUESTIONS)[number]) => {
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  const longestDistractor = Math.max(
    ...question.options
      .filter((option) => option.id !== question.correctOptionId)
      .map((option) => option.text.length),
  );
  return Boolean(correct && correct.text.length > longestDistractor);
};
const globalLengthOutliers = fourOptionQuestions.filter((question) => {
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  const longestDistractor = Math.max(
    ...question.options
      .filter((option) => option.id !== question.correctOptionId)
      .map((option) => option.text.length),
  );
  return Boolean(correct && correct.text.length > longestDistractor * 1.25);
});
const retiredLookupQuestions = SEED_QUESTIONS.filter((question) =>
  question.tags.some((tag) =>
    ["tld", "callingCode", "continent"].includes(tag),
  ),
);
const retainedCountryLookups = SEED_QUESTIONS.filter((question) =>
  question.tags.some((tag) =>
    ["capital", "currency", "language"].includes(tag),
  ),
);

const report = {
  questions: SEED_QUESTIONS.length,
  categories: CATEGORIES.length,
  invalid: invalid.length,
  duplicatePrompts: promptKeys.length - new Set(promptKeys).size,
  duplicateOptions: duplicateOptions.length,
  machineCopy: machineCopy.length,
  lowercaseOptions: lowercaseOptions.length,
  answerLeaks: answerLeaks.length,
  obviousCountryAnswers: obviousCountryAnswers.length,
  longestOption: Math.max(
    ...SEED_QUESTIONS.flatMap((question) =>
      question.options.map((option) => option.text.length),
    ),
  ),
  explanatoryLengthOutliers: explanatoryLengthOutliers.length,
  explanatoryCorrectLongestRate: Number(
    (explanatoryCorrectLongest.length / explanatoryCuriosity.length).toFixed(2),
  ),
  globalLengthOutliers: globalLengthOutliers.length,
  globalCorrectLongestRate: Number(
    (
      fourOptionQuestions.filter(correctIsLongest).length /
      fourOptionQuestions.length
    ).toFixed(2),
  ),
  retiredLookupQuestions: retiredLookupQuestions.length,
  retainedCountryLookups: retainedCountryLookups.length,
  thinCategories: thinCategories.map((category) => category.name),
};

console.log(JSON.stringify(report, null, 2));

if (
  report.invalid > 0 ||
  report.duplicatePrompts > 0 ||
  report.duplicateOptions > 0 ||
  report.machineCopy > 0 ||
  report.lowercaseOptions > 0 ||
  report.answerLeaks > 0 ||
  report.obviousCountryAnswers > 0 ||
  report.explanatoryLengthOutliers > 0 ||
  report.explanatoryCorrectLongestRate > 0.35 ||
  report.globalLengthOutliers > 0 ||
  report.globalCorrectLongestRate > 0.35 ||
  report.retiredLookupQuestions > 0 ||
  report.retainedCountryLookups > 65 ||
  report.longestOption > 70 ||
  report.thinCategories.length > 0
) {
  process.exitCode = 1;
}
