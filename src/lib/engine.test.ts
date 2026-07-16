import { describe, expect, it } from "vitest";
import {
  calculatePoints,
  difficultyFor,
  fingerprint,
  isNearDuplicate,
  normalizeText,
  selectQuestions,
  shuffleAnswers,
  similarity,
  stableHash,
} from "./engine";
import { SEED_QUESTIONS } from "@/data/questions";
import { CATEGORIES, DEFAULT_CATEGORIES } from "./categories";
import { questionSchema } from "./types";
const setup = {
  mode: "classic" as const,
  players: [],
  questionCount: 20,
  difficulty: 3,
  difficultyMode: "mixed" as const,
  categoryIds: CATEGORIES.map((c) => c.id),
  favorites: [],
  timer: false,
  minusPoints: false,
  finale: false,
};
describe("pointberegning", () => {
  it("giver 1000 standardpoint og forståelig risiko", () => {
    expect(calculatePoints(true, 10000, false)).toBe(1000);
    expect(calculatePoints(false, 10000, false, 3)).toBe(-1500);
    expect(calculatePoints(true, 0, true)).toBe(1500);
  });
});
describe("sværhedsgrad", () => {
  it("stiger og holdes i 1–5", () => {
    expect(difficultyFor(0, 10, 3, "rising")).toBe(2);
    expect(difficultyFor(9, 10, 3, "rising")).toBe(4);
    expect(difficultyFor(0, 10, 1, "mixed")).toBe(1);
  });
});
describe("fingerprinting", () => {
  it("normaliserer dansk tekst stabilt", () => {
    expect(normalizeText("  HÉJ,  Ø! ")).toBe("hej ø");
    expect(stableHash("Hej!")).toBe(stableHash("hej"));
    expect(fingerprint("Hvem er Zeus?", "Zeus", "quote")).toBe(
      fingerprint("Hvem er Zeus", "Zeus", "quote"),
    );
  });
});
describe("dubletkontrol", () => {
  it("finder nær-dubletter", () => {
    const a = SEED_QUESTIONS[0],
      b = { ...a, id: "x", prompt: `${a.prompt} ` };
    expect(isNearDuplicate(a, b)).toBe(true);
    expect(similarity("kat hund mus", "kat hund fugl")).toBeCloseTo(0.5);
  });
});
describe("svarrandomisering", () => {
  it("bevarer korrekt option-id", () => {
    const q = SEED_QUESTIONS[0],
      x = shuffleAnswers(q, () => 0.1);
    expect(x.correctOptionId).toBe(q.correctOptionId);
    expect(x.options).toHaveLength(q.options.length);
  });
});
describe("seedbank og Zod", () => {
  it("har mindst 1.000 komplette, valide spørgsmål", () => {
    expect(SEED_QUESTIONS.length).toBeGreaterThanOrEqual(1000);
    expect(
      SEED_QUESTIONS.every((q) => questionSchema.safeParse(q).success),
    ).toBe(true);
    expect(new Set(SEED_QUESTIONS.map((q) => q.id)).size).toBe(
      SEED_QUESTIONS.length,
    );
    expect(new Set(SEED_QUESTIONS.map((q) => q.fingerprint)).size).toBe(
      SEED_QUESTIONS.length,
    );
  });
  it("har plausible talmuligheder til sekskanten", () => {
    const q = SEED_QUESTIONS.find((x) =>
      x.prompt.includes("regulær sekskant"),
    )!;
    expect(q.options.map((o) => o.text)).toEqual(["6", "5", "7", "8"]);
  });
  it("holder nichekategorier ude af standard- og tilfældigpuljen", () => {
    expect(CATEGORIES.find((category) => category.id === "cat-23")?.niche).toBe(
      true,
    );
    expect(
      DEFAULT_CATEGORIES.some((category) => category.id === "cat-23"),
    ).toBe(false);
    expect(
      SEED_QUESTIONS.filter((question) => question.categoryId === "cat-23")
        .length,
    ).toBeGreaterThanOrEqual(60);
  });
  it("giver de nye brede kategorier en reel startbank", () => {
    const newCategoryIds = [
      "cat-54",
      "cat-55",
      "cat-56",
      "cat-57",
      "cat-58",
      "cat-59",
    ];
    expect(CATEGORIES).toHaveLength(59);
    for (const categoryId of newCategoryIds) {
      expect(
        SEED_QUESTIONS.filter((question) => question.categoryId === categoryId)
          .length,
      ).toBeGreaterThanOrEqual(10);
    }
  });
  it("har en valideret Wikidata-udvidelse til tynde kategorier", () => {
    const thinQuestions = SEED_QUESTIONS.filter((question) =>
      question.id.startsWith("wikithin-"),
    );
    expect(thinQuestions.length).toBeGreaterThanOrEqual(250);
    expect(
      thinQuestions.every(
        (question) => question.sourceLabel === "Wikidata (CC0)",
      ),
    ).toBe(true);
  });
});
describe("adaptiv udvælgelse", () => {
  it("giver forskellige nye browsere forskellige startrækkefølger", () => {
    const seeded = (initial: number) => {
      let state = initial;
      return () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    };
    const gameSetup = { ...setup, questionCount: 10 };
    const first = selectQuestions(SEED_QUESTIONS, gameSetup, [], seeded(1));
    const second = selectQuestions(SEED_QUESTIONS, gameSetup, [], seeded(2));
    expect(first.map((question) => question.id)).not.toEqual(
      second.map((question) => question.id),
    );
    expect(first[0].prompt).not.toBe(
      "Hvilket grundstof har det kemiske symbol Au?",
    );
  });
  it("undgår gentagelser og respekterer kategorier", () => {
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      questionCount: 30,
      categoryIds: ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"],
    });
    expect(chosen).toHaveLength(30);
    expect(new Set(chosen.map((q) => q.id)).size).toBe(30);
    expect(
      chosen.every((q) => setup.categoryIds.slice(0, 5).includes(q.categoryId)),
    ).toBe(true);
  });
  it("prioriterer usete spørgsmål", () => {
    const seen = SEED_QUESTIONS.slice(0, 300).map((q) => ({
      id: q.id,
      lastSeen: new Date().toISOString(),
      count: 3,
      correct: true,
    }));
    const chosen = selectQuestions(
      SEED_QUESTIONS,
      { ...setup, questionCount: 10 },
      seen,
    );
    expect(
      chosen.some((q) => SEED_QUESTIONS.slice(300).some((x) => x.id === q.id)),
    ).toBe(true);
  });
});
describe("kategori-vægtning", () => {
  it("favoritter får forrang ved lige vilkår", () => {
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      questionCount: 6,
      favorites: ["cat-20"],
    });
    expect(chosen.some((q) => q.categoryId === "cat-20")).toBe(true);
  });
});
