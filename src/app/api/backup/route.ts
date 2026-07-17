import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

const seenSchema = z.object({
  id: z.string().min(1).max(160),
  lastSeen: z.string().max(40),
  count: z.number().int().min(1).max(10_000),
  correct: z.boolean(),
  fingerprint: z.string().max(240).optional(),
  factKey: z.string().max(240).optional(),
});
const payloadSchema = z.object({
  seen: z.array(seenSchema).max(2_000),
  setup: z.record(z.string(), z.unknown()),
});
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), payload: payloadSchema }),
  z.object({ action: z.literal("restore"), code: z.string().min(8).max(32) }),
]);
const attempts = new Map<string, { count: number; reset: number }>();

function hashCode(code: string) {
  return createHash("sha256")
    .update(code.replace(/\s|-/g, "").toUpperCase())
    .digest("hex");
}

function makeCode() {
  const compact = randomBytes(9).toString("base64url").toUpperCase();
  return `KVIZY-${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const previous = attempts.get(ip);
  if (previous && previous.reset > now && previous.count >= 10)
    return NextResponse.json(
      { error: "For mange forsøg. Prøv igen senere." },
      { status: 429 },
    );
  attempts.set(ip, {
    count: previous && previous.reset > now ? previous.count + 1 : 1,
    reset: now + 60_000,
  });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Backupdata er ugyldige." },
      { status: 400 },
    );
  if (!hasDatabase())
    return NextResponse.json(
      { error: "Cloud-backup er midlertidigt utilgængelig." },
      { status: 503 },
    );

  try {
    if (parsed.data.action === "create") {
      const code = makeCode();
      const createdAt = new Date();
      const expiresAt = new Date(
        createdAt.getTime() + 365 * 24 * 60 * 60 * 1000,
      );
      const value = {
        version: 1,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        payload: parsed.data.payload,
      };
      await getDb()
        .insert(appSettings)
        .values({ id: `backup:${hashCode(code)}`, value })
        .onConflictDoUpdate({
          target: appSettings.id,
          set: { value, updatedAt: createdAt },
        });
      return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
    }

    const [row] = await getDb()
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, `backup:${hashCode(parsed.data.code)}`))
      .limit(1);
    const stored = z
      .object({ expiresAt: z.string(), payload: payloadSchema })
      .safeParse(row?.value);
    if (!stored.success || new Date(stored.data.expiresAt).getTime() < now)
      return NextResponse.json(
        { error: "Backupkoden findes ikke eller er udløbet." },
        { status: 404 },
      );
    return NextResponse.json({ payload: stored.data.payload });
  } catch {
    return NextResponse.json(
      { error: "Backup kunne ikke behandles lige nu." },
      { status: 503 },
    );
  }
}
