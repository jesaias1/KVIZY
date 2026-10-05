import { describe, expect, it } from "vitest";
import {
  applyGame,
  emptyAchievementState,
  sanitizeAchievementState,
} from "./achievements";
import type { Game, Question } from "./types";

const questions = Array.from(
  { length: 10 },
  (_, i) => ({ id: `q${i}`, difficulty: i < 5 ? 4 : 2 }) as Question,
);

const game = (
  correctCount: number,
  extra: Partial<Game["setup"]> = {},
  players = 1,
) =>
  ({
    setup: {
      mode: "solo",
      players: Array.from({ length: players }, (_, i) => ({ id: `p${i}` })),
      ...extra,
    },
    questions,
    answers: questions.map((q, i) => ({
      questionId: q.id,
      playerId: "p0",
      correct: i < correctCount,
    })),
  }) as unknown as Game;

describe("præstationer", () => {
  it("låser første runde op og tæller svar", () => {
    const { state, newlyUnlocked } = applyGame(
      emptyAchievementState(),
      game(4),
    );
    expect(newlyUnlocked.map((a) => a.id)).toEqual(["first"]);
    expect(state.counters).toMatchObject({
      games: 1,
      answered: 10,
      correct: 4,
      hardCorrect: 4,
    });
  });

  it("giver Fuldt hus for en perfekt solorunde, men ikke for øvelsesrunder", () => {
    const perfect = applyGame(emptyAchievementState(), game(10));
    expect(perfect.newlyUnlocked.map((a) => a.id)).toContain("perfect");
    const practice = applyGame(emptyAchievementState(), {
      ...game(10),
      practice: true,
    } as Game);
    expect(practice.newlyUnlocked.map((a) => a.id)).not.toContain("perfect");
  });

  it("låser aldrig det samme op to gange", () => {
    const once = applyGame(emptyAchievementState(), game(2));
    const twice = applyGame(once.state, game(2));
    expect(twice.newlyUnlocked.map((a) => a.id)).not.toContain("first");
  });

  it("husker bedste lynrunde og dagsstime", () => {
    const { state } = applyGame(
      emptyAchievementState(),
      game(10, { mode: "blitz" }),
      { dailyStreak: 3 },
    );
    expect(state.counters.blitzBest).toBe(10);
    expect(state.unlocked.blitz10).toBeTruthy();
    expect(state.unlocked.daily3).toBeTruthy();
  });

  it("tåler beskadiget gemt tilstand", () => {
    expect(sanitizeAchievementState("junk")).toEqual(emptyAchievementState());
    const state = sanitizeAchievementState({
      counters: { games: "x", correct: 5 },
      unlocked: { first: "2026-01-01", bad: 3 },
    });
    expect(state.counters.games).toBe(0);
    expect(state.counters.correct).toBe(5);
    expect(state.unlocked).toEqual({ first: "2026-01-01" });
  });
});
