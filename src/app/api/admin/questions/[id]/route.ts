import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requestIsAdmin } from "@/lib/admin-auth";
import { getDb, hasDatabase } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import { optionSchema } from "@/lib/types";

const updateSchema = z
  .object({
    prompt: z.string().trim().min(8).max(300).optional(),
    explanation: z.string().trim().min(8).max(500).optional(),
    difficulty: z.number().int().min(1).max(5).optional(),
    status: z.enum(["draft", "active", "disabled", "reported"]).optional(),
    qualityScore: z.number().int().min(0).max(100).optional(),
    options: z.array(optionSchema).min(2).max(4).optional(),
    correctOptionId: z.string().min(1).optional(),
  })
  .strict();

export async function PATCH(
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
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Ugyldige ændringer" }, { status: 400 });
  const { id } = await context.params;
  try {
    const [updated] = await getDb()
      .update(questions)
      .set({
        ...parsed.data,
        validationStatus: "admin-edited",
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id))
      .returning({ id: questions.id });
    if (!updated)
      return NextResponse.json(
        { error: "Spørgsmålet findes ikke" },
        { status: 404 },
      );
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json(
      { error: "Spørgsmålet kunne ikke opdateres" },
      { status: 503 },
    );
  }
}
