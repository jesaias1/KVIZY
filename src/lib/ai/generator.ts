import { generateText, Output } from "ai";
import { z } from "zod";
import { SEED_QUESTIONS } from "@/data/questions";
import { fingerprint, isNearDuplicate } from "@/lib/engine";
import { questionSchema, questionTypes, type Question } from "@/lib/types";
const generated = z.object({
  questions: z
    .array(
      z.object({
        prompt: z.string().min(12).max(240),
        type: z.enum(questionTypes),
        secondaryCategoryIds: z.array(z.string()).max(3),
        difficulty: z.number().int().min(1).max(5),
        options: z.array(z.string().min(1).max(90)).min(2).max(4),
        correctAnswer: z.string().min(1).max(90),
        explanation: z.string().min(15).max(400),
        sourceLabel: z.string().min(3).max(160),
        sourceUrl: z.url().optional(),
        tags: z.array(z.string()).min(1).max(8),
        timeSensitive: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
});
export const generationRequestSchema = z.object({
  categoryId: z.string().regex(/^cat-\d+$/),
  categoryName: z.string().min(2),
  secondaryCategory: z.string().optional(),
  difficulty: z.number().int().min(1).max(5),
  count: z.number().int().min(1).max(20),
  type: z.enum(questionTypes),
});
export async function generateQuestions(
  input: z.infer<typeof generationRequestSchema>,
) {
  const model = process.env.AI_MODEL ?? "openai/gpt-5.4-mini";
  const { output } = await generateText({
    model,
    output: Output.object({ schema: generated }),
    prompt: `Generér ${input.count} originale danske quizspørgsmål. Kategori: ${input.categoryName}. Sekundær kategori: ${input.secondaryCategory ?? "ingen"}. Sværhedsgrad: ${input.difficulty}/5. Type: ${input.type}. Fire grammatisk parallelle, plausible svar undtagen sandt/falsk. Ét entydigt korrekt svar. Holdbar fakta; tidsfølsomt stof skal dateres og have kilde. Ingen alle/ingen ovenstående. Undgå disse fingerprints: ${SEED_QUESTIONS.slice(
      0,
      80,
    )
      .map((q) => q.fingerprint)
      .join(",")}.`,
  });
  const now = new Date().toISOString();
  const accepted: Question[] = [];
  const rejected: string[] = [];
  for (const [i, x] of output.questions.entries()) {
    const lower = x.options.map((o) => o.trim().toLocaleLowerCase("da"));
    if (
      new Set(lower).size !== lower.length ||
      !lower.includes(x.correctAnswer.trim().toLocaleLowerCase("da")) ||
      x.options.some((o) => /alle ovenstående|ingen af ovenstående/i.test(o)) ||
      !/\b(og|er|det|den|en|et|hvad|hvilken|hvem|som|på|af|til)\b/i.test(
        `${x.prompt} ${x.explanation}`,
      )
    ) {
      rejected.push(x.prompt);
      continue;
    }
    const options = x.options.map((text, j) => ({ id: `o${j + 1}`, text }));
    const correct = options.find(
      (o) =>
        o.text.trim().toLocaleLowerCase("da") ===
        x.correctAnswer.trim().toLocaleLowerCase("da"),
    );
    const q = questionSchema.parse({
      id: `ai-${Date.now()}-${i}`,
      prompt: x.prompt,
      type: x.type,
      categoryId: input.categoryId,
      secondaryCategoryIds: x.secondaryCategoryIds,
      difficulty: x.difficulty,
      options,
      correctOptionId: correct?.id,
      explanation: x.explanation,
      sourceLabel: x.sourceLabel,
      sourceUrl: x.sourceUrl,
      tags: x.tags,
      origin: "ai",
      status: "draft",
      fingerprint: fingerprint(x.prompt, x.correctAnswer, x.type),
      qualityScore: x.sourceUrl ? 90 : 82,
      timeSensitive: x.timeSensitive,
      createdAt: now,
      updatedAt: now,
      modelId: model,
      promptVersion: "kvizy-1",
      validationStatus: "passed",
      playCount: 0,
      correctRate: 0,
      reportCount: 0,
    });
    if (
      [...SEED_QUESTIONS, ...accepted].some((existing) =>
        isNearDuplicate(existing, q),
      )
    ) {
      rejected.push(x.prompt);
      continue;
    }
    accepted.push(q);
  }
  return { accepted, rejected, model };
}
