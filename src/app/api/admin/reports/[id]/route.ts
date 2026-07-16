import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestIsAdmin } from "@/lib/admin-auth";
import { getDb, hasDatabase } from "@/lib/db";
import { questionReports } from "@/lib/db/schema";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!requestIsAdmin(request))
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  if (!hasDatabase())
    return NextResponse.json(
      { error: "Databasen er ikke konfigureret" },
      { status: 503 },
    );
  const { id } = await context.params;
  try {
    await getDb().delete(questionReports).where(eq(questionReports.id, id));
    return NextResponse.json({ resolved: true });
  } catch {
    return NextResponse.json(
      { error: "Rapporten kunne ikke afsluttes" },
      { status: 503 },
    );
  }
}
