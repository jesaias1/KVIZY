import { eq, gte, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { SEED_QUESTIONS } from "@/data/questions";
import { CATEGORIES } from "@/lib/categories";
import { getDb, hasDatabase } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import { serializeQuestionRow } from "@/lib/db/question-rows";
import type { Question } from "@/lib/types";

export const dynamic = "force-dynamic";

const validCategoryIds = new Set(CATEGORIES.map((category) => category.id));

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams
    .get("categories")
    ?.split(",")
    .filter((id) => validCategoryIds.has(id));
  const categoryIds = new Set(
    requested?.length ? requested : CATEGORIES.map((category) => category.id),
  );
  let overrides = new Map<string, Question>();

  if (hasDatabase()) {
    try {
      const rows = await getDb()
        .select()
        .from(questions)
        .where(
          or(
            eq(questions.validationStatus, "admin-edited"),
            gte(questions.reportCount, 3),
            ne(questions.status, "active"),
          ),
        );
      overrides = new Map(
        rows
          .map((row) => serializeQuestionRow(row))
          .filter((question): question is Question => question !== null)
          .map((question) => [question.id, question]),
      );
    } catch {
      // Den kuraterede bank fungerer fortsat, hvis databasen kortvarigt fejler.
    }
  }

  const bank = SEED_QUESTIONS.map(
    (question) => overrides.get(question.id) ?? question,
  ).filter(
    (question) =>
      question.status === "active" &&
      question.reportCount < 3 &&
      (categoryIds.has(question.categoryId) ||
        question.secondaryCategoryIds.some((id) => categoryIds.has(id))),
  );

  return NextResponse.json(
    { questions: bank, version: "2026-07-17" },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
