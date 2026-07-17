import { like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requestIsAdmin } from "@/lib/admin-auth";
import { getDb, hasDatabase } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export async function GET(request: Request) {
  if (!requestIsAdmin(request))
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  if (!hasDatabase())
    return NextResponse.json({ gamesStarted: 0, gamesCompleted: 0, reports: 0, categories: {} });
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const rows = await getDb()
      .select()
      .from(appSettings)
      .where(like(appSettings.id, "analytics:%"));
    const result = {
      gamesStarted: 0,
      gamesCompleted: 0,
      reports: 0,
      categories: {} as Record<string, number>,
    };
    for (const row of rows) {
      const [, day, kind, categoryId] = row.id.split(":");
      if (!day || day < cutoff) continue;
      const count = z.object({ count: z.number() }).safeParse(row.value);
      if (!count.success) continue;
      if (kind === "game_started") result.gamesStarted += count.data.count;
      if (kind === "game_completed") result.gamesCompleted += count.data.count;
      if (kind === "question_reported") result.reports += count.data.count;
      if (kind === "category" && categoryId)
        result.categories[categoryId] =
          (result.categories[categoryId] ?? 0) + count.data.count;
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Statistik kunne ikke hentes" }, { status: 503 });
  }
}
