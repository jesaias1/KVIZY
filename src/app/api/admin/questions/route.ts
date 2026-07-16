import { NextResponse } from "next/server";
import { requestIsAdmin } from "@/lib/admin-auth";
import { getDb, hasDatabase } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import { serializeQuestionRow } from "@/lib/db/question-rows";

export async function GET(request: Request) {
  if (!requestIsAdmin(request))
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  if (!hasDatabase())
    return NextResponse.json({ questions: [], databaseReady: false });
  try {
    const rows = await getDb().select().from(questions);
    return NextResponse.json({
      questions: rows
        .map((row) => serializeQuestionRow(row))
        .filter((question) => question !== null),
      databaseReady: true,
    });
  } catch {
    return NextResponse.json(
      { questions: [], databaseReady: false },
      { status: 503 },
    );
  }
}
