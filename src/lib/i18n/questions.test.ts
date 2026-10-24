import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "@/data/questions";
import { EN_SKIP_IDS } from "./en-skip";
import { localizeQuestion, type EnglishPack } from "./questions";

const pack = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "public/i18n/questions.en.json"),
    "utf8",
  ),
) as EnglishPack;

describe("engelske spørgsmål", () => {
  it("dækker hvert spørgsmål eller står på udeladelseslisten", () => {
    const uncovered = SEED_QUESTIONS.filter(
      (q) => !pack.q[q.id] && !EN_SKIP_IDS.has(q.id),
    ).map((q) => q.id);
    expect(uncovered).toEqual([]);
  });

  it("har lige mange svarmuligheder som dansk og ingen tomme tekster", () => {
    const wrong = SEED_QUESTIONS.filter((q) => {
      const en = pack.q[q.id];
      return (
        en &&
        (en.o.length !== q.options.length ||
          !en.p.trim() ||
          !en.e.trim() ||
          en.o.some((o) => !o.trim()))
      );
    }).map((q) => q.id);
    expect(wrong).toEqual([]);
  });

  it("indeholder ingen ukendte eller udeladte spørgsmål", () => {
    const known = new Set(SEED_QUESTIONS.map((q) => q.id));
    expect(Object.keys(pack.q).filter((id) => !known.has(id))).toEqual([]);
    expect(Object.keys(pack.q).filter((id) => EN_SKIP_IDS.has(id))).toEqual([]);
  });

  it("bevarer det rigtige svar, når teksten byttes ud", () => {
    const question = SEED_QUESTIONS.find(
      (q) => q.type === "multiple_choice" && pack.q[q.id],
    )!;
    const english = localizeQuestion(question, pack);
    const index = question.options.findIndex(
      (o) => o.id === question.correctOptionId,
    );
    expect(english.correctOptionId).toBe(question.correctOptionId);
    expect(english.options[index].text).toBe(pack.q[question.id].o[index]);
    expect(english.prompt).toBe(pack.q[question.id].p);
  });

  it("lader spørgsmål uden oversættelse være", () => {
    const question = SEED_QUESTIONS[0];
    expect(localizeQuestion(question, null)).toBe(question);
    expect(localizeQuestion(question, { v: "x", skip: [], q: {} })).toBe(
      question,
    );
  });
});
