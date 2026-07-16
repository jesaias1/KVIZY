import { SEED_QUESTIONS } from "../src/data/questions";
import { CATEGORIES } from "../src/lib/categories";
import { normalizeText } from "../src/lib/engine";
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
  ].some((text) => /registreret som|centrale sammenhæng/i.test(text)),
);
const lowercaseOptions = SEED_QUESTIONS.filter((question) =>
  question.options.some(
    (option) =>
      /^\p{Ll}/u.test(option.text) &&
      !/^(iPhone|iPad|iOS|iPod|eBay|macOS)\b/.test(option.text),
  ),
);
const thinCategories = CATEGORIES.filter(
  (category) =>
    SEED_QUESTIONS.filter(
      (question) =>
        question.categoryId === category.id ||
        question.secondaryCategoryIds.includes(category.id),
    ).length < 10,
);

const report = {
  questions: SEED_QUESTIONS.length,
  categories: CATEGORIES.length,
  invalid: invalid.length,
  duplicatePrompts: promptKeys.length - new Set(promptKeys).size,
  duplicateOptions: duplicateOptions.length,
  machineCopy: machineCopy.length,
  lowercaseOptions: lowercaseOptions.length,
  longestOption: Math.max(
    ...SEED_QUESTIONS.flatMap((question) =>
      question.options.map((option) => option.text.length),
    ),
  ),
  thinCategories: thinCategories.map((category) => category.name),
};

console.log(JSON.stringify(report, null, 2));

if (
  report.invalid > 0 ||
  report.duplicatePrompts > 0 ||
  report.duplicateOptions > 0 ||
  report.machineCopy > 0 ||
  report.lowercaseOptions > 0 ||
  report.longestOption > 70 ||
  report.thinCategories.length > 0
) {
  process.exitCode = 1;
}
