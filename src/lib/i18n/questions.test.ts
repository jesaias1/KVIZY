import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "@/data/questions";
import { shuffle } from "@/lib/engine";
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
        (Object.keys(en.o).length !== q.options.length ||
          q.options.some((o) => !(o.id in en.o)) ||
          !en.p.trim() ||
          !en.e.trim() ||
          Object.values(en.o).some((o) => !o.trim()))
      );
    }).map((q) => q.id);
    expect(wrong).toEqual([]);
  });

  it("indeholder ingen ukendte eller udeladte spørgsmål", () => {
    const known = new Set(SEED_QUESTIONS.map((q) => q.id));
    expect(Object.keys(pack.q).filter((id) => !known.has(id))).toEqual([]);
    expect(Object.keys(pack.q).filter((id) => EN_SKIP_IDS.has(id))).toEqual([]);
  });

  it("bevarer det rigtige svar, også når svarene er blandet", () => {
    // Spillet blander svarmulighederne, før teksten byttes ud: oversættelsen
    // skal følge svarmulighedens id og aldrig dens plads.
    let checked = 0;
    for (const question of SEED_QUESTIONS) {
      const en = pack.q[question.id];
      if (!en || !question.correctOptionId) continue;
      for (const seed of [1, 2, 3]) {
        let state = seed;
        const random = () =>
          (state = (state * 16807) % 2147483647) / 2147483647;
        const shuffled = {
          ...question,
          options: shuffle(question.options, random),
        };
        const english = localizeQuestion(shuffled, pack);
        const correct = english.options.find(
          (o) => o.id === question.correctOptionId,
        );
        expect(correct?.text).toBe(en.o[question.correctOptionId]);
        expect(english.prompt).toBe(en.p);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5000);
  });

  it("lader spørgsmål uden oversættelse være", () => {
    const question = SEED_QUESTIONS[0];
    expect(localizeQuestion(question, null)).toBe(question);
    expect(localizeQuestion(question, { v: "x", skip: [], q: {} })).toBe(
      question,
    );
  });
});
