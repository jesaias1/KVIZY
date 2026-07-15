import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SEED_QUESTIONS } from "../src/data/questions";
import { questionSchema } from "../src/lib/types";
async function main() {
  const [command, fileArg = "kvizy-questions.json"] = process.argv.slice(2),
    file = resolve(fileArg);
  if (command === "export") {
    await writeFile(file, JSON.stringify(SEED_QUESTIONS, null, 2), "utf8");
    console.log(`Eksporterede ${SEED_QUESTIONS.length} spørgsmål til ${file}`);
    return;
  }
  if (command === "import") {
    const value = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(value))
      throw new Error("Importen skal være et JSON-array");
    const parsed = value.map((item, index) => {
      const result = questionSchema.safeParse(item);
      if (!result.success)
        throw new Error(
          `Ugyldigt spørgsmål ved indeks ${index}: ${result.error.issues[0]?.message}`,
        );
      return result.data;
    });
    if (new Set(parsed.map((q) => q.fingerprint)).size !== parsed.length)
      throw new Error("Importen indeholder dublerede fingerprints");
    console.log(
      `Validering bestået for ${parsed.length} spørgsmål. Brug admin eller seed-scriptet til databaseimport.`,
    );
    return;
  }
  throw new Error("Brug: questions.ts export [fil] eller import [fil]");
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Ukendt fejl");
  process.exit(1);
});
