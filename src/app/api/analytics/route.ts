import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";
import { getDb, hasDatabase } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

const eventSchema = z.object({
  event: z.enum(["game_started", "game_completed", "question_reported"]),
  categoryIds: z.array(z.string()).max(100).default([]),
});
const validCategories = new Set(CATEGORIES.map((category) => category.id));
const attempts = new Map<string, { count: number; reset: number }>();

async function increment(id: string) {
  await getDb()
    .insert(appSettings)
    .values({ id, value: { count: 1 } })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        value: sql`jsonb_build_object('count', COALESCE((${appSettings.value}->>'count')::int, 0) + 1)`,
        updatedAt: new Date(),
      },
    });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const previous = attempts.get(ip);
  if (previous && previous.reset > now && previous.count >= 30)
    return new NextResponse(null, { status: 202 });
  attempts.set(ip, {
    count: previous && previous.reset > now ? previous.count + 1 : 1,
    reset: now + 60_000,
  });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Ugyldig hændelse" }, { status: 400 });
  if (!hasDatabase()) return new NextResponse(null, { status: 202 });
  const day = new Date().toISOString().slice(0, 10);
  try {
    await increment(`analytics:${day}:${parsed.data.event}`);
    if (parsed.data.event === "game_started") {
      const categories = new Set(
        parsed.data.categoryIds.filter((id) => validCategories.has(id)),
      );
      for (const categoryId of categories)
        await increment(`analytics:${day}:category:${categoryId}`);
    }
  } catch {
    // Statistik må aldrig påvirke spillet.
  }
  return new NextResponse(null, { status: 202 });
}
