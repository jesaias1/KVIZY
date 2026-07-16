import { describe, expect, it } from "vitest";
import {
  answerIsCorrect,
  calculateQuestionPoints,
  calculatePoints,
  difficultyFor,
  fingerprint,
  isGeneralKnowledgeQuestion,
  isNearDuplicate,
  newPlayer,
  normalizeText,
  rankPlayers,
  selectQuestions,
  shuffleAnswers,
  similarity,
  stableHash,
} from "./engine";
import { SEED_QUESTIONS } from "@/data/questions";
import { CATEGORIES, DEFAULT_CATEGORIES } from "./categories";
import { ANIMAL_AVATARS } from "./config";
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
  timeBonus: false,
  streakBonus: false,
  minusPoints: false,
  finale: false,
};
describe("pointberegning", () => {
  it("giver 100 standardpoint og forståelig risiko", () => {
    expect(calculatePoints(true, 10000, false)).toBe(100);
    expect(calculatePoints(true, 0, false)).toBe(100);
    expect(calculatePoints(true, 29000, false)).toBe(100);
    expect(calculatePoints(false, 10000, false, 3)).toBe(-150);
    expect(calculatePoints(true, 0, true)).toBe(150);
  });
  it("giver kun streakbonus efter et aktivt tilvalg", () => {
    const question = SEED_QUESTIONS.find(
      (item) => item.type === "multiple_choice",
    )!;
    const answer = question.correctOptionId!;
    expect(
      calculateQuestionPoints(
        question,
        answer,
        5_000,
        false,
        1,
        false,
        3,
        false,
      ),
    ).toBe(100);
    expect(
      calculateQuestionPoints(
        question,
        answer,
        5_000,
        false,
        1,
        false,
        3,
        true,
      ),
    ).toBe(175);
  });
});
describe("placeringer", () => {
  it("giver spillere med samme point samme plads", () => {
    const standings = rankPlayers([
      { name: "A", score: 300 },
      { name: "B", score: 500 },
      { name: "C", score: 500 },
      { name: "D", score: 100 },
    ]);
    expect(
      standings.map(({ player, rank }) => [player.name, player.score, rank]),
    ).toEqual([
      ["B", 500, 1],
      ["C", 500, 1],
      ["A", 300, 3],
      ["D", 100, 4],
    ]);
  });
});
describe("spilleravatarer", () => {
  it("tilbyder mange unikke dyr og giver nye spillere et gyldigt dyr", () => {
    expect(ANIMAL_AVATARS).toHaveLength(32);
    expect(new Set(ANIMAL_AVATARS).size).toBe(ANIMAL_AVATARS.length);
    expect(ANIMAL_AVATARS).toContain(newPlayer("Spiller", 31).avatar);
  });
});
describe("sværhedsgrad", () => {
  it("stiger og holdes i 1–5", () => {
    expect(difficultyFor(0, 10, 3, "rising")).toBe(2);
    expect(difficultyFor(9, 10, 3, "rising")).toBe(4);
    expect(difficultyFor(0, 10, 1, "mixed", () => 0)).toBe(1);
  });
  it("blander uden et fast let-mellem-svært-mønster", () => {
    const values = [0.9, 0.1, 0.55, 0.9, 0.9];
    expect(
      values.map((value, index) =>
        difficultyFor(index, values.length, 3, "mixed", () => value),
      ),
    ).toEqual([4, 2, 3, 4, 4]);
  });
  it("holder yderpunkterne inden for 1–2 og 4–5", () => {
    expect(difficultyFor(9, 10, 1, "rising")).toBe(2);
    expect(difficultyFor(0, 10, 5, "rising")).toBe(4);
    expect(difficultyFor(9, 10, 5, "rising")).toBe(5);
  });
  it("klassificerer kernefakta efter indhold og ikke placering", () => {
    expect(
      SEED_QUESTIONS.find((question) =>
        question.prompt.includes("vands kemiske formel"),
      )?.difficulty,
    ).toBe(2);
    expect(
      SEED_QUESTIONS.find((question) =>
        question.prompt.includes("religionsfrihed"),
      )?.difficulty,
    ).toBe(4);
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
    for (const categoryId of ["cat-13", "cat-23"]) {
      expect(
        CATEGORIES.find((category) => category.id === categoryId)?.niche,
      ).toBe(true);
      expect(
        DEFAULT_CATEGORIES.some((category) => category.id === categoryId),
      ).toBe(false);
    }
    expect(
      SEED_QUESTIONS.filter((question) => question.categoryId === "cat-23")
        .length,
    ).toBeGreaterThanOrEqual(100);
    expect(
      SEED_QUESTIONS.filter((question) => question.tags.includes("flstudio")),
    ).toHaveLength(30);
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
        SEED_QUESTIONS.filter(
          (question) =>
            question.categoryId === categoryId ||
            question.secondaryCategoryIds.includes(categoryId),
        ).length,
      ).toBeGreaterThanOrEqual(10);
    }
  });
  it("har en valideret Wikidata-udvidelse til tynde kategorier", () => {
    const thinQuestions = SEED_QUESTIONS.filter((question) =>
      question.id.startsWith("wikithin-"),
    );
    expect(thinQuestions.length).toBeGreaterThanOrEqual(80);
    expect(
      thinQuestions.every(
        (question) =>
          Boolean(question.sourceLabel) &&
          Boolean(question.sourceUrl?.startsWith("https://")),
      ),
    ).toBe(true);
  });
  it("giver hver kategori mindst ti semantisk relevante spørgsmål", () => {
    for (const category of CATEGORIES) {
      expect(
        SEED_QUESTIONS.filter(
          (question) =>
            question.categoryId === category.id ||
            question.secondaryCategoryIds.includes(category.id),
        ).length,
      ).toBeGreaterThanOrEqual(10);
    }
  });
  it("kan fylde et normalt spil fra hver almindelig emnekategori", () => {
    const umbrellaCategoryIds = new Set([
      "cat-1",
      "cat-45",
      "cat-46",
      "cat-47",
    ]);
    for (const category of CATEGORIES) {
      if (umbrellaCategoryIds.has(category.id)) continue;
      expect(
        SEED_QUESTIONS.filter((question) => question.categoryId === category.id)
          .length,
        category.name,
      ).toBeGreaterThanOrEqual(10);
    }
  });
});
describe("adaptiv udvælgelse", () => {
  it("returnerer komplette spørgsmål for et normalt spil med to spillere", () => {
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      players: [newPlayer("Spiller 1", 0), newPlayer("Spiller 2", 1)],
      questionCount: 10,
    });

    expect(chosen).toHaveLength(10);
    expect(Object.keys(chosen)).toHaveLength(10);
    expect(chosen.every((question) => Boolean(question?.id))).toBe(true);
  });

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
    const selectedCategoryIds = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"];
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      questionCount: 30,
      categoryIds: selectedCategoryIds,
    });
    expect(chosen).toHaveLength(30);
    expect(new Set(chosen.map((q) => q.id)).size).toBe(30);
    expect(
      chosen.every((q) => selectedCategoryIds.includes(q.categoryId)),
    ).toBe(true);
  });
  it("holder musikproduktion ude, når kategorien er fravalgt", () => {
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      questionCount: 40,
      categoryIds: ["cat-9", "cat-21"],
    });
    expect(chosen.length).toBeGreaterThan(0);
    expect(chosen.every((question) => question.categoryId !== "cat-23")).toBe(
      true,
    );
    expect(
      chosen.every((question) =>
        ["cat-9", "cat-21"].includes(question.categoryId),
      ),
    ).toBe(true);
  });
  it("lader ikke store kategorier dominere et blandet spil", () => {
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      questionCount: 30,
    });
    const categoryCounts = Object.values(
      Object.groupBy(chosen, (question) => question.categoryId),
    ).map((questions) => questions?.length ?? 0);
    expect(Math.max(...categoryCounts)).toBeLessThanOrEqual(2);
    expect(
      chosen.filter((question) => question.categoryId === "cat-58").length,
    ).toBeLessThanOrEqual(2);
    for (const tag of [
      "painting-artist",
      "film-director",
      "building-architect",
      "capital",
      "continent",
      "currency",
    ]) {
      expect(
        chosen.filter((question) => question.tags.includes(tag)).length,
      ).toBeLessThanOrEqual(2);
    }
  });
  it("fordeler bred paratviden gennem hele et standardspil", () => {
    let randomState = 19;
    const random = () =>
      (randomState = (randomState * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const chosen = selectQuestions(
      SEED_QUESTIONS,
      { ...setup, questionCount: 30 },
      [],
      random,
    );
    const generalIndexes = chosen
      .map((question, index) =>
        isGeneralKnowledgeQuestion(question) ? index : -1,
      )
      .filter((index) => index >= 0);
    expect(generalIndexes.length).toBeGreaterThanOrEqual(6);
    expect(generalIndexes.some((index) => index < 10)).toBe(true);
    expect(generalIndexes.some((index) => index >= 20)).toBe(true);
  });
  it("kan fylde et spil, når kun General paratviden er valgt", () => {
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      questionCount: 20,
      categoryIds: ["cat-1"],
    });
    expect(chosen).toHaveLength(20);
    expect(chosen.every(isGeneralKnowledgeQuestion)).toBe(true);
  });
  it("kan fylde spil fra en valgt spørgsmålsform", () => {
    const chosen = selectQuestions(SEED_QUESTIONS, {
      ...setup,
      questionCount: 10,
      categoryIds: ["cat-47"],
    });
    expect(chosen).toHaveLength(10);
    expect(chosen.every((question) => question.type === "true_false")).toBe(
      true,
    );
  });
  it("fordeler sandt eller falsk og rækkefølge helt lige mellem spillerne", () => {
    const playerCount = 3;
    let randomState = 7;
    const random = () =>
      (randomState = (randomState * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const chosen = selectQuestions(
      SEED_QUESTIONS,
      {
        ...setup,
        players: Array.from({ length: playerCount }, (_, index) =>
          newPlayer(`Spiller ${index + 1}`, index),
        ),
        questionCount: 60,
      },
      [],
      random,
    );
    const fairTypes = ["true_false", "ordering"] as const;
    expect(Object.keys(chosen)).toHaveLength(chosen.length);
    expect(chosen.every((question) => Boolean(question?.id))).toBe(true);
    expect(
      chosen.some(
        (question) =>
          question.type === "true_false" || question.type === "ordering",
      ),
    ).toBe(true);
    for (const type of fairTypes) {
      const counts = Array.from(
        { length: playerCount },
        (_, playerIndex) =>
          chosen.filter(
            (question, questionIndex) =>
              questionIndex % playerCount === playerIndex &&
              question.type === type,
          ).length,
      );
      expect(new Set(counts).size).toBe(1);
    }
    for (let index = 1; index < chosen.length; index++) {
      expect(
        chosen[index].type === "true_false" &&
          chosen[index - 1].type === "true_false",
      ).toBe(false);
    }
  });
  it("giver spillerne omtrent samme samlede sværhedsgrad", () => {
    const playerCount = 3;
    for (const difficulty of [1, 2, 3, 4, 5]) {
      for (let seed = 1; seed <= 4; seed++) {
        let randomState = seed;
        const random = () =>
          (randomState = (randomState * 1664525 + 1013904223) >>> 0) / 2 ** 32;
        const chosen = selectQuestions(
          SEED_QUESTIONS,
          {
            ...setup,
            players: Array.from({ length: playerCount }, (_, index) =>
              newPlayer(`Spiller ${index + 1}`, index),
            ),
            questionCount: 30,
            difficulty,
          },
          [],
          random,
        );
        const minimum = Math.max(1, difficulty - 1);
        const maximum = Math.min(5, difficulty + 1);
        expect(
          chosen.every(
            (question) =>
              question.difficulty >= minimum && question.difficulty <= maximum,
          ),
        ).toBe(true);
        const totals = Array.from({ length: playerCount }, (_, playerIndex) =>
          chosen.reduce(
            (sum, question, questionIndex) =>
              questionIndex % playerCount === playerIndex
                ? sum + question.difficulty
                : sum,
            0,
          ),
        );
        expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(
          1,
        );
      }
    }
  });
  it("holder gennemsnitsniveauet fair for både små og store spillergrupper", () => {
    for (const playerCount of [2, 4, 7, 10, 12]) {
      let randomState = 31 + playerCount;
      const random = () =>
        (randomState = (randomState * 1664525 + 1013904223) >>> 0) / 2 ** 32;
      const chosen = selectQuestions(
        SEED_QUESTIONS,
        {
          ...setup,
          players: Array.from({ length: playerCount }, (_, index) =>
            newPlayer(`Spiller ${index + 1}`, index),
          ),
          questionCount: 60,
          difficulty: 3,
        },
        [],
        random,
      );
      const averages = Array.from({ length: playerCount }, (_, playerIndex) => {
        const turns = chosen.filter(
          (_, questionIndex) => questionIndex % playerCount === playerIndex,
        );
        return (
          turns.reduce((sum, question) => sum + question.difficulty, 0) /
          turns.length
        );
      });
      expect(Math.max(...averages) - Math.min(...averages)).toBeLessThanOrEqual(
        0.35,
      );
    }
  }, 10_000);
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

describe("specialspørgsmål", () => {
  it("validerer en valgt rækkefølge", () => {
    const question = SEED_QUESTIONS.find((item) => item.type === "ordering")!;
    expect(answerIsCorrect(question, question.correctOrder!.join("|"))).toBe(
      true,
    );
    expect(
      answerIsCorrect(
        question,
        [...question.correctOrder!].reverse().join("|"),
      ),
    ).toBe(false);
  });

  it("giver faldende point efter afstand i nærmest vinder", () => {
    const question = SEED_QUESTIONS.find(
      (item) => item.type === "closest_wins",
    )!;
    const exact = calculateQuestionPoints(
      question,
      question.correctOptionId!,
      1000,
      false,
    );
    const other = calculateQuestionPoints(
      question,
      question.options.find((item) => item.id !== question.correctOptionId)!.id,
      1000,
      false,
    );
    expect(exact).toBe(100);
    expect(other).toBeLessThan(exact);
    expect(other).toBeGreaterThan(0);
  });
});
