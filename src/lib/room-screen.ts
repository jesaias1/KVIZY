import type { RoomState } from "./room-game";
import { answerCounts, remainingMs, standings } from "./room-game";
import type { RoomPublicPlayer, RoomStanding } from "./room-protocol";

// Alt, en storskærm skal kunne tegne. Værten bygger modellen ud fra spiltilstanden
// og viser den selv; en ekstra skærm (fx et TV) får den samme model tilsendt.
// Modellen indeholder aldrig noget, en spiller ikke måtte se på storskærmen.

export type RoomSummary = {
  count: number;
  limitSec: number;
  level: number;
  topics: number;
};

export type ScreenOption = {
  id: string;
  text: string;
  count?: number;
  correct?: boolean;
};

export type ScreenModel =
  | {
      phase: "lobby";
      code: string;
      joinUrl: string;
      players: (RoomPublicPlayer & { away?: boolean })[];
      summary: RoomSummary;
    }
  | {
      phase: "question";
      i: number;
      total: number;
      prompt: string;
      category: string;
      qType: string;
      options: ScreenOption[];
      limitMs: number;
      remainingMs: number;
      answered: number;
      playerCount: number;
      answeredIds: string[];
      players: RoomPublicPlayer[];
    }
  | {
      phase: "reveal";
      i: number;
      total: number;
      prompt: string;
      category: string;
      options: ScreenOption[];
      explanation: string;
      correctCount: number;
      playerCount: number;
      board: (RoomStanding & { rank: number })[];
      gained: Record<string, number>;
      last: boolean;
    }
  | {
      phase: "end";
      board: (RoomStanding & { rank: number })[];
      winners: number;
    };

export type ScreenContext = {
  code: string;
  joinUrl: string;
  summary: RoomSummary;
  categoryName: (categoryId: string) => string;
};

export function buildScreenModel(
  state: RoomState,
  context: ScreenContext,
  now: number,
): ScreenModel {
  const question = state.questions[state.index];
  if (state.phase === "lobby" || !question) {
    return {
      phase: "lobby",
      code: context.code,
      joinUrl: context.joinUrl,
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        away: !p.connected,
      })),
      summary: context.summary,
    };
  }
  const category = context.categoryName(question.categoryId);
  if (state.phase === "question") {
    return {
      phase: "question",
      i: state.index,
      total: state.questions.length,
      prompt: question.prompt,
      category,
      qType: question.type,
      options: question.options.map((o) => ({ id: o.id, text: o.text })),
      limitMs: state.limitMs,
      remainingMs: remainingMs(state, now),
      answered: Object.keys(state.answers).length,
      playerCount: state.players.length,
      answeredIds: Object.keys(state.answers),
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
      })),
    };
  }
  const board = standings(state);
  if (state.phase === "reveal") {
    const counts = answerCounts(state);
    return {
      phase: "reveal",
      i: state.index,
      total: state.questions.length,
      prompt: question.prompt,
      category,
      options: question.options.map((o) => ({
        id: o.id,
        text: o.text,
        count: counts[o.id] ?? 0,
        correct: o.id === question.correctOptionId,
      })),
      explanation: question.explanation ?? "",
      correctCount: Object.values(state.results).filter((r) => r.correct)
        .length,
      playerCount: state.players.length,
      board: board.slice(0, 5),
      gained: Object.fromEntries(
        Object.entries(state.results).map(([id, r]) => [id, r.points]),
      ),
      last: state.index >= state.questions.length - 1,
    };
  }
  return {
    phase: "end",
    board: board.slice(0, 10),
    winners: board.filter((row) => row.rank === 1).length,
  };
}

/** Er et indkommende objekt en brugbar skærmmodel? Skærme får data fra et fremmed netværk. */
export function isScreenModel(value: unknown): value is ScreenModel {
  if (!value || typeof value !== "object") return false;
  const phase = (value as { phase?: unknown }).phase;
  return (
    phase === "lobby" ||
    phase === "question" ||
    phase === "reveal" ||
    phase === "end"
  );
}
