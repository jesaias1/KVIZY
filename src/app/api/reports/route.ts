import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { SEED_QUESTIONS } from "@/data/questions";
import { ensureReportsTable, getDb, hasDatabase } from "@/lib/db";
import { questionReports, questions } from "@/lib/db/schema";
import { questionReportReasons } from "@/lib/types";

const reportSchema = z.object({
  questionId: z.string().min(1).max(160),
  reason: z.enum(questionReportReasons),
  note: z.string().trim().max(240).optional(),
});
const attempts = new Map<string, { count: number; reset: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const previous = attempts.get(ip);
  if (previous && previous.reset > now && previous.count >= 12)
    return NextResponse.json(
      { error: "For mange rapporter. Prøv igen senere." },
      { status: 429 },
    );
  attempts.set(ip, {
    count: previous && previous.reset > now ? previous.count + 1 : 1,
    reset: now + 60_000,
  });
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (
    !parsed.success ||
    !SEED_QUESTIONS.some((question) => question.id === parsed.data.questionId)
  )
    return NextResponse.json({ error: "Ugyldig rapport" }, { status: 400 });
  if (!hasDatabase())
    return NextResponse.json(
      { accepted: true, stored: false },
      { status: 202 },
    );
  try {
    await ensureReportsTable();
    await getDb()
      .insert(questionReports)
      .values({
        questionId: parsed.data.questionId,
        reason: parsed.data.note
          ? `${parsed.data.reason}:${parsed.data.note}`
          : parsed.data.reason,
      });
    // Tælleren på spørgsmålstabellen er en bonus; rapporten er allerede gemt.
    try {
      await getDb()
        .update(questions)
        .set({
          reportCount: sql`${questions.reportCount} + 1`,
          status: sql`CASE WHEN ${questions.reportCount} + 1 >= 3 THEN 'reported' ELSE ${questions.status} END`,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, parsed.data.questionId));
    } catch {
      // Tabellen findes ikke i en ny database.
    }
    return NextResponse.json({ accepted: true, stored: true });
  } catch {
    return NextResponse.json(
      { accepted: true, stored: false },
      { status: 202 },
    );
  }
}
