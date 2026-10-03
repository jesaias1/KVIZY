import { describe, expect, it } from "vitest";
import { computeAwards } from "./awards";
import type { Game, GamePlayer, PlayerAnswer, Question } from "./types";

const player = (id: string, longestStreak: number): GamePlayer =>
  ({
    id,
    name: id,
    avatar: "🐶",
    score: 0,
    correct: 0,
    answers: 0,
    streak: 0,
    longestStreak,
  }) as GamePlayer;

const question = (id: string, difficulty: number) =>
  ({ id, difficulty }) as Question;

const answer = (
  playerId: string,
  questionId: string,
  correct: boolean,
  responseMs: number,
): PlayerAnswer => ({
  questionId,
  playerId,
  optionId: "o",
  correct,
  points: 0,
  responseMs,
  categoryId: "cat-1",
});

const game = (players: GamePlayer[], answers: PlayerAnswer[]) =>
  ({
    setup: { players },
    questions: ["a", "b", "c", "d", "e", "f"].map((id, i) =>
      question(id, i < 3 ? 4 : 2),
    ),
    answers,
  }) as unknown as Game;

describe("computeAwards", () => {
  it("giver ingen titler til soloruder eller meget korte spil", () => {
    expect(computeAwards(game([player("A", 5)], []))).toEqual([]);
    expect(
      computeAwards(game([player("A", 5), player("B", 1)], [])),
    ).toEqual([]);
  });

  it("uddeler højst én titel pr. spiller og kun for tydelige præstationer", () => {
    const answers = [
      answer("A", "a", true, 1000),
      answer("B", "b", true, 4000),
      answer("A", "c", true, 1200),
      answer("B", "d", true, 5000),
      answer("A", "e", false, 3000),
      answer("B", "f", true, 4500),
    ];
    const awards = computeAwards(game([player("A", 4), player("B", 1)], answers));
    expect(awards.find((a) => a.id === "fastest")?.playerId).toBe("A");
    const holders = awards.map((a) => a.playerId);
    expect(new Set(holders).size).toBe(holders.length);
    expect(awards.some((a) => a.id === "streak" && a.playerId === "A")).toBe(
      false,
    );
  });
});
