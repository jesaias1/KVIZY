import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import { serializeQuestionRow } from "@/lib/db/question-rows";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ overrides: [] });
  try {
    const rows = await getDb()
      .select()
      .from(questions)
      .where(eq(questions.validationStatus, "admin-edited"));
    return NextResponse.json({
      overrides: rows
        .map((row) => serializeQuestionRow(row))
        .filter((question) => question !== null),
    });
  } catch {
    return NextResponse.json({ overrides: [] });
  }
}
