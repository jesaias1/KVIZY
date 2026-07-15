import { getDb } from "../src/lib/db";
import { categories, questions } from "../src/lib/db/schema";
import { CATEGORIES } from "../src/lib/categories";
import { SEED_QUESTIONS } from "../src/data/questions";
async function main() {
  const db = getDb();
  await db.insert(categories).values(CATEGORIES).onConflictDoNothing();
  await db
    .insert(questions)
    .values(
      SEED_QUESTIONS.map((q) => ({
        ...q,
        validUntil: q.validUntil ? new Date(q.validUntil) : null,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt),
        correctRate: String(q.correctRate),
      })),
    )
    .onConflictDoNothing();
  console.log(
    `Seed færdig: ${CATEGORIES.length} kategorier og ${SEED_QUESTIONS.length} spørgsmål.`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Ukendt seed-fejl");
  process.exit(1);
});
