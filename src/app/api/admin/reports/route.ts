import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestIsAdmin } from "@/lib/admin-auth";
import { getDb, hasDatabase } from "@/lib/db";
import { questionReports } from "@/lib/db/schema";

export async function GET(request: Request) {
  if (!requestIsAdmin(request))
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ reports: [] });
  try {
    const reports = await getDb()
      .select()
      .from(questionReports)
      .orderBy(desc(questionReports.createdAt))
      .limit(200);
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json(
      { error: "Rapporter kunne ikke hentes" },
      { status: 503 },
    );
  }
}
