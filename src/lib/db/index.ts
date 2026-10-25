import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL er ikke konfigureret");
  if (!instance) instance = drizzle(neon(process.env.DATABASE_URL), { schema });
  return instance;
}
export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

let reportsTableReady: Promise<void> | null = null;
/** Opretter rapporttabellen første gang, så en ny database virker uden manuel opsætning. */
export function ensureReportsTable() {
  if (!reportsTableReady) {
    const sql = neon(process.env.DATABASE_URL ?? "");
    reportsTableReady = sql`CREATE TABLE IF NOT EXISTS question_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id text NOT NULL,
      reason text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`.then(() => undefined);
    reportsTableReady.catch(() => {
      reportsTableReady = null;
    });
  }
  return reportsTableReady;
}
