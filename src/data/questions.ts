import { CATEGORIES } from "@/lib/categories";
import { fingerprint } from "@/lib/engine";
import type { Question, QuestionType } from "@/lib/types";
import { seedSpecs } from "./seed-spec";

const typeCycle: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "odd_one_out",
  "what_came_first",
  "quote",
  "incorrect_statement",
  "correct_statement",
  "description",
  "closest_wins",
  "precise",
  "emoji",
  "category_cross",
];
const created = "2026-07-15T00:00:00.000Z";
export const SEED_QUESTIONS: Question[] = seedSpecs.flatMap((spec) => {
  const answers = spec.items.map((x) => x[1]);
  return spec.items.map((item, i) => {
    const [prompt, correct, detail] = item;
    const type =
      spec.categoryId === "cat-47"
        ? "true_false"
        : spec.categoryId === "cat-45"
          ? "what_came_first"
          : spec.categoryId === "cat-46"
            ? "odd_one_out"
            : typeCycle[
                (Number(spec.categoryId.slice(4)) + i) % typeCycle.length
              ];
    const distractors =
      type === "true_false"
        ? [correct === "Sandt" ? "Falsk" : "Sandt"]
        : answers
            .filter((answer, index, all) =>
              answer !== correct && all.indexOf(answer) === index,
            )
            .slice(0, 3);
    const texts = [correct, ...distractors].slice(
      0,
      type === "true_false" ? 2 : 4,
    );
    const options = texts.map((text, j) => ({ id: `o${j + 1}`, text }));
    return {
      id: `q-${spec.categoryId}-${i + 1}`,
      prompt,
      type,
      categoryId: spec.categoryId,
      secondaryCategoryIds: [],
      difficulty: (Number(spec.categoryId.slice(4)) + i * 2) % 11,
      options,
      correctOptionId: "o1",
      explanation:
        detail ??
        `Det korrekte svar er ${correct}. Spørgsmålet er kvalitetssikret som holdbar paratviden.`,
      sourceLabel: "KVIZY redaktionel seedbank",
      tags: [
        CATEGORIES.find(
          (c) => c.id === spec.categoryId,
        )?.name.toLocaleLowerCase("da") ?? "quiz",
      ],
      origin: "curated",
      status: "active",
      fingerprint: fingerprint(prompt, correct, type),
      qualityScore: 92,
      timeSensitive: spec.categoryId === "cat-53",
      createdAt: created,
      updatedAt: created,
      playCount: 0,
      correctRate: 0,
      reportCount: 0,
    } satisfies Question;
  });
});
