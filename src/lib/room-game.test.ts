import { describe, expect, it } from "vitest";
import {
  addPlayer,
  allAnswered,
  answerCounts,
  emptyRoom,
  nextQuestion,
  removePlayer,
  revealQuestion,
  roomPoints,
  setConnected,
  standings,
  startGame,
  submitAnswer,
} from "./room-game";
import {
  clientMessageSchema,
  makeRoomCode,
  normalizeRoomCode,
  sanitizeRoomName,
} from "./room-protocol";
import type { Question } from "./types";

const question = (id: string): Question =>
  ({
    id,
    prompt: `Spørgsmål ${id}`,
    type: "multiple_choice",
    options: [
      { id: `${id}-a`, text: "A" },
      { id: `${id}-b`, text: "B" },
    ],
    correctOptionId: `${id}-a`,
  }) as Question;

const lobby = () => {
  let state = emptyRoom();
  state = addPlayer(state, {
    id: "player-aaaa",
    name: "Anna",
    avatar: "🐱",
  }).state;
  state = addPlayer(state, {
    id: "player-bbbb",
    name: "Bo",
    avatar: "🐶",
  }).state;
  return state;
};

describe("rumkoder og navne", () => {
  it("laver koder uden forvekslelige bogstaver", () => {
    for (let i = 0; i < 200; i++) {
      const code = makeRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    }
  });

  it("normaliserer indtastede koder", () => {
    expect(normalizeRoomCode(" ab-cd ")).toBe("ABCD");
    expect(normalizeRoomCode("ABC")).toBeNull();
    expect(normalizeRoomCode("AB1D")).toBeNull();
    expect(normalizeRoomCode("ABOD")).toBeNull();
  });

  it("renser navne", () => {
    expect(sanitizeRoomName("  <b>Hej</b>   verden  ")).toBe("bHej/b verden");
    expect(sanitizeRoomName("")).toBe("Spiller");
    expect(sanitizeRoomName("x".repeat(80))).toHaveLength(16);
  });

  it("afviser ugyldige beskeder fra telefoner", () => {
    expect(
      clientMessageSchema.safeParse({ t: "answer", i: 0, o: "x" }).success,
    ).toBe(true);
    expect(
      clientMessageSchema.safeParse({ t: "answer", i: -1, o: "x" }).success,
    ).toBe(false);
    expect(clientMessageSchema.safeParse({ t: "hack" }).success).toBe(false);
    expect(
      clientMessageSchema.safeParse({
        t: "hello",
        pid: "kort",
        name: "A",
        avatar: "🐶",
      }).success,
    ).toBe(false);
  });
});

describe("rumpoint", () => {
  it("giver 0 for forkert og 600–1000 for rigtigt efter fart", () => {
    expect(roomPoints(false, 0, 20_000, 5)).toBe(0);
    expect(roomPoints(true, 0, 20_000, 0)).toBe(1000);
    expect(roomPoints(true, 20_000, 20_000, 0)).toBe(600);
    expect(roomPoints(true, 10_000, 20_000, 0)).toBe(800);
  });

  it("giver stimebonus op til tre trin", () => {
    expect(roomPoints(true, 20_000, 20_000, 1)).toBe(650);
    expect(roomPoints(true, 20_000, 20_000, 9)).toBe(750);
  });
});

describe("rumspil", () => {
  it("giver unikke navne og tillader at genoptage samme spiller", () => {
    let state = lobby();
    state = addPlayer(state, {
      id: "player-cccc",
      name: "Anna",
      avatar: "🦊",
    }).state;
    expect(state.players.map((p) => p.name)).toEqual(["Anna", "Bo", "Anna 2"]);
    const again = addPlayer(state, {
      id: "player-aaaa",
      name: "Ny",
      avatar: "🐶",
    });
    expect(again.state.players).toHaveLength(3);
    expect(again.state.players[0].name).toBe("Anna");
  });

  it("afviser spillere over grænsen", () => {
    let state = emptyRoom();
    for (let i = 0; i < 40; i++)
      state = addPlayer(state, {
        id: `player-${String(i).padStart(4, "0")}`,
        name: `S${i}`,
        avatar: "🐶",
      }).state;
    const result = addPlayer(state, {
      id: "player-extra",
      name: "Sen",
      avatar: "🐶",
    });
    expect(result.accepted).toBe(false);
    expect(result.state.players).toHaveLength(40);
  });

  it("kører en hel runde med point, rangering og afslutning", () => {
    let state = startGame(lobby(), [question("q1"), question("q2")], 1_000);
    expect(state.phase).toBe("question");
    state = submitAnswer(state, "player-aaaa", 0, "q1-a", 2_000);
    expect(allAnswered(state)).toBe(false);
    state = submitAnswer(state, "player-bbbb", 0, "q1-b", 3_000);
    expect(allAnswered(state)).toBe(true);
    expect(answerCounts(state)).toEqual({ "q1-a": 1, "q1-b": 1 });
    state = revealQuestion(state);
    expect(state.phase).toBe("reveal");
    expect(state.results["player-aaaa"]).toMatchObject({
      correct: true,
      points: 600 + 380,
    });
    expect(state.results["player-bbbb"]).toMatchObject({
      correct: false,
      points: 0,
    });
    state = nextQuestion(state, 10_000);
    expect(state.index).toBe(1);
    state = submitAnswer(state, "player-aaaa", 1, "q2-a", 10_500);
    state = revealQuestion(state);
    // Anna: andet rigtige i træk giver stimebonus. Bo svarede ikke.
    expect(state.results["player-aaaa"].points).toBe(600 + 390 + 50);
    expect(state.results["player-bbbb"].answered).toBe(false);
    state = nextQuestion(state, 20_000);
    expect(state.phase).toBe("end");
    const board = standings(state);
    expect(board[0]).toMatchObject({ name: "Anna", rank: 1 });
    expect(board[1]).toMatchObject({ name: "Bo", rank: 2, score: 0 });
  });

  it("ignorerer dobbeltsvar, forkerte spørgsmål og ukendte svarmuligheder", () => {
    let state = startGame(lobby(), [question("q1")], 0);
    state = submitAnswer(state, "player-aaaa", 0, "q1-a", 100);
    const doubled = submitAnswer(state, "player-aaaa", 0, "q1-b", 200);
    expect(doubled.answers["player-aaaa"].optionId).toBe("q1-a");
    expect(submitAnswer(state, "player-bbbb", 3, "q1-a", 100)).toBe(state);
    expect(submitAnswer(state, "player-bbbb", 0, "snyd", 100)).toBe(state);
    expect(submitAnswer(state, "ukendt-spiller", 0, "q1-a", 100)).toBe(state);
    expect(submitAnswer(state, "player-bbbb", 0, "q1-a", 99_999)).toBe(state);
  });

  it("venter ikke på spillere, der har mistet forbindelsen", () => {
    let state = startGame(lobby(), [question("q1")], 0);
    state = submitAnswer(state, "player-aaaa", 0, "q1-a", 100);
    expect(allAnswered(state)).toBe(false);
    state = setConnected(state, "player-bbbb", false);
    expect(allAnswered(state)).toBe(true);
    state = removePlayer(state, "player-bbbb");
    expect(state.players).toHaveLength(1);
  });

  it("deler rang ved pointlighed", () => {
    const state = startGame(lobby(), [question("q1")], 0);
    expect(standings(state).map((s) => s.rank)).toEqual([1, 1]);
  });
});
