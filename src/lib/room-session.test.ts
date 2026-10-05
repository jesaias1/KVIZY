import { describe, expect, it } from "vitest";
import { reviveRoomState } from "./room-session";
import { addPlayer, emptyRoom, startGame } from "./room-game";
import type { Question } from "./types";

const question = {
  id: "q1",
  prompt: "Spørgsmål",
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
  ],
  correctOptionId: "a",
} as Question;

describe("genoprettelse af værtens rum", () => {
  it("genskaber et igangværende spil og markerer alle som fraværende", () => {
    let state = emptyRoom();
    state = addPlayer(state, {
      id: "player-aaaa",
      name: "Anna",
      avatar: "🐱",
    }).state;
    state = startGame(state, [question], 5_000);
    const revived = reviveRoomState(JSON.parse(JSON.stringify(state)));
    expect(revived?.phase).toBe("question");
    expect(revived?.startedAt).toBe(5_000);
    expect(revived?.players[0]).toMatchObject({
      name: "Anna",
      connected: false,
    });
  });

  it("afviser ødelagte eller uforståelige tilstande", () => {
    expect(reviveRoomState(null)).toBeNull();
    expect(reviveRoomState("tekst")).toBeNull();
    expect(reviveRoomState({ phase: "snyd" })).toBeNull();
    expect(
      reviveRoomState({ ...emptyRoom(), phase: "question", questions: [] }),
    ).toBeNull();
    expect(reviveRoomState({ ...emptyRoom(), limitMs: 0 })).toBeNull();
  });

  it("skræller ugyldige spillere væk", () => {
    const revived = reviveRoomState({
      ...emptyRoom(),
      players: [null, { id: 7 }, { id: "player-ok12", name: "Bo", score: 3 }],
    });
    expect(revived?.players).toHaveLength(1);
    expect(revived?.players[0].name).toBe("Bo");
  });
});
