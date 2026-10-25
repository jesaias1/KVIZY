import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "@/data/questions";
import {
  addPlayer,
  emptyRoom,
  revealQuestion,
  startGame,
  submitAnswer,
} from "./room-game";
import { buildScreenModel, isScreenModel } from "./room-screen";

const context = {
  code: "ABCD",
  joinUrl: "https://kvizy.dk/?rum=ABCD",
  summary: { count: 10, limitSec: 20, level: 3, topics: 5 },
  categoryName: (id: string) => id,
};
const questions = SEED_QUESTIONS.filter(
  (q) => q.type === "multiple_choice",
).slice(0, 3);

function withPlayers() {
  let state = emptyRoom();
  for (const [id, name] of [
    ["p1-aaaaaaaa", "Mette"],
    ["p2-bbbbbbbb", "Jens"],
  ])
    state = addPlayer(state, { id, name, avatar: "🐶" }).state;
  return state;
}

describe("skærmmodel", () => {
  it("viser lobbyen med kode og spillere", () => {
    const model = buildScreenModel(withPlayers(), context, 0);
    expect(model.phase).toBe("lobby");
    if (model.phase === "lobby") {
      expect(model.code).toBe("ABCD");
      expect(model.players).toHaveLength(2);
    }
  });

  it("afslører ikke det rigtige svar, mens spørgsmålet er åbent", () => {
    const state = startGame(withPlayers(), questions, 1000);
    const model = buildScreenModel(state, context, 2000);
    expect(model.phase).toBe("question");
    expect(JSON.stringify(model)).not.toContain('"correct"');
    if (model.phase === "question") {
      expect(model.remainingMs).toBeLessThan(state.limitMs);
      expect(model.answered).toBe(0);
    }
  });

  it("tæller svar og markerer det rigtige efter afsløring", () => {
    let state = startGame(withPlayers(), questions, 1000);
    const q = state.questions[0];
    state = submitAnswer(state, "p1-aaaaaaaa", 0, q.correctOptionId!, 2000);
    state = submitAnswer(
      state,
      "p2-bbbbbbbb",
      0,
      q.options.find((o) => o.id !== q.correctOptionId)!.id,
      2500,
    );
    const open = buildScreenModel(state, context, 3000);
    if (open.phase === "question") expect(open.answered).toBe(2);
    const model = buildScreenModel(revealQuestion(state), context, 3000);
    expect(model.phase).toBe("reveal");
    if (model.phase === "reveal") {
      expect(model.options.filter((o) => o.correct)).toHaveLength(1);
      expect(model.correctCount).toBe(1);
      expect(model.board[0].name).toBe("Mette");
    }
  });

  it("genkender kun gyldige modeller", () => {
    expect(isScreenModel({ phase: "end", board: [], winners: 0 })).toBe(true);
    expect(isScreenModel({ phase: "hack" })).toBe(false);
    expect(isScreenModel(null)).toBe(false);
  });
});
