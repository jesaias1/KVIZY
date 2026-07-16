import type { Question } from "@/lib/types";
import { questionSchema } from "@/lib/types";

export function serializeQuestionRow(
  row: Record<string, unknown>,
): Question | null {
  const parsed = questionSchema.safeParse({
    ...row,
    correctRate: Number(row.correctRate ?? 0),
    validUntil:
      row.validUntil instanceof Date
        ? row.validUntil.toISOString()
        : row.validUntil || undefined,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : row.updatedAt,
  });
  return parsed.success ? parsed.data : null;
}
