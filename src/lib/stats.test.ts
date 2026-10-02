import { describe, expect, it } from "vitest";
import { computeStats, weakestCategories } from "./stats";
import { SEED_QUESTIONS } from "@/data/questions";
import { newPlayer } from "./engine";
import type { GameResult } from "./types";

const baseSetup = {
  mode: "solo" as const,
  players: [],
  questionCount: 4,
  difficulty: 3,
  difficultyMode: "fixed" as const,
  categoryIds: [],
  favorites: [],
  timer: false,
  timeBonus: false,
  streakBonus: false,
  minusPoints: false,
  finale: false,
  lifelines: false,
};

function result(
  playerCount: number,
  outcomes: Array<[string, boolean]>,
): GameResult {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    ...newPlayer(`S${i}`, i),
    longestStreak: 3,
  }));
  const questions = outcomes.map(([categoryId], index) => ({
    ...SEED_QUESTIONS[index],
    id: `q${index}-${categoryId}`,
    categoryId,
    difficulty: 2 + (index % 2),
  }));
  return {
    id: crypto.randomUUID(),
    playedAt: "2026-10-03T10:00:00.000Z",
    setup: { ...baseSetup, players },
    players,
    questions,
    answers: outcomes.map(([categoryId, correct], index) => ({
      questionId: questions[index].id,
      playerId: players[0].id,
      optionId: "o1",
      correct,
      points: correct ? 100 : 0,
      responseMs: 2000,
      categoryId,
    })),
  };
}

describe("statistik", () => {
  it("regner rigtige svar pr. kategori og niveau", () => {
    const stats = computeStats([
      result(1, [
        ["cat-2", true],
        ["cat-2", false],
        ["cat-5", true],
        ["cat-5", true],
      ]),
    ]);
    expect(stats.games).toBe(1);
    expect(stats.answers).toBe(4);
    expect(stats.rate).toBe(0.75);
    expect(stats.bestStreak).toBe(3);
    expect(stats.categories.find((c) => c.categoryId === "cat-2")?.rate).toBe(0.5);
    expect(stats.levels.map((level) => level.level)).toEqual([2, 3]);
  });
  it("lader solospil gå forud for spil med flere spillere", () => {
    const stats = computeStats([
      result(2, [["cat-2", false]]),
      result(1, [["cat-5", true]]),
    ]);
    expect(stats.soloOnly).toBe(true);
    expect(stats.answers).toBe(1);
  });
  it("falder tilbage til alle spil, når der kun er flerspillerspil", () => {
    const stats = computeStats([result(2, [["cat-2", true]])]);
    expect(stats.soloOnly).toBe(false);
    expect(stats.answers).toBe(1);
  });
  it("finder de svageste kategorier og springer tynde data over", () => {
    const stats = computeStats([
      result(1, [
        ["cat-2", false],
        ["cat-2", false],
        ["cat-2", true],
        ["cat-5", true],
        ["cat-5", true],
        ["cat-5", true],
        ["cat-7", false],
      ]),
    ]);
    // cat-7 har kun ét svar, og cat-5 er fejlfri.
    expect(weakestCategories(stats)).toEqual(["cat-2"]);
  });
  it("giver tom statistik uden historik", () => {
    const stats = computeStats([]);
    expect(stats.games).toBe(0);
    expect(weakestCategories(stats)).toEqual([]);
  });
});
