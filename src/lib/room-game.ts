import type { Question } from "./types";
import {
  ROOM_MAX_PLAYERS,
  safeRoomAvatar,
  sanitizeRoomName,
  type RoomStanding,
} from "./room-protocol";

// Ren spillelogik for rum. Ingen netværk eller React her, så reglerne kan
// testes uden telefoner: værten holder en RoomState og kalder funktionerne.

export type RoomPhase = "lobby" | "question" | "reveal" | "end";

export type RoomPlayer = {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  correct: number;
  connected: boolean;
};

export type RoomResult = {
  correct: boolean;
  answered: boolean;
  points: number;
};

export type RoomState = {
  phase: RoomPhase;
  players: RoomPlayer[];
  questions: Question[];
  index: number;
  limitMs: number;
  startedAt: number;
  answers: Record<string, { optionId: string; at: number }>;
  results: Record<string, RoomResult>;
};

export const ROOM_LIMIT_MS = 20_000;
/** limitMs = 0 betyder, at spørgsmålene ikke har nogen tidsgrænse. */
export const hasTimeLimit = (state: Pick<RoomState, "limitMs">) =>
  state.limitMs > 0;
/** Værten kan spille med; vedkommende er en spiller uden netværksforbindelse. */
export const ROOM_HOST_PID = "host-local-player";
/** Uden tidsgrænse regnes fartbonussen stadig ud fra en 20 sekunders vindue. */
const SPEED_WINDOW_MS = 20_000;

export const emptyRoom = (): RoomState => ({
  phase: "lobby",
  players: [],
  questions: [],
  index: 0,
  limitMs: ROOM_LIMIT_MS,
  startedAt: 0,
  answers: {},
  results: {},
});

/** Point: 600 for rigtigt, op til 400 for fart og 50 pr. rigtige i træk (maks. 3). */
export function roomPoints(
  correct: boolean,
  elapsedMs: number,
  limitMs: number,
  streakBefore: number,
) {
  if (!correct) return 0;
  const window = limitMs > 0 ? limitMs : SPEED_WINDOW_MS;
  const speed = Math.max(0, Math.min(1, 1 - elapsedMs / window));
  return 600 + Math.round(400 * speed) + Math.min(3, streakBefore) * 50;
}

export function addPlayer(
  state: RoomState,
  input: { id: string; name: string; avatar: string },
): { state: RoomState; accepted: boolean } {
  const existing = state.players.find((p) => p.id === input.id);
  if (existing)
    return {
      accepted: true,
      state: {
        ...state,
        players: state.players.map((p) =>
          p.id === input.id ? { ...p, connected: true } : p,
        ),
      },
    };
  // Nye spillere kan kun komme med i lobbyen – eller midt i spillet, hvis der
  // er plads, så en der mistede forbindelsen med et nyt id ikke bliver spærret.
  if (state.players.length >= ROOM_MAX_PLAYERS)
    return { state, accepted: false };
  const base = sanitizeRoomName(input.name);
  let name = base;
  for (let n = 2; state.players.some((p) => p.name === name); n++)
    name = `${base.slice(0, 13)} ${n}`;
  return {
    accepted: true,
    state: {
      ...state,
      players: [
        ...state.players,
        {
          id: input.id,
          name,
          avatar: safeRoomAvatar(input.avatar),
          score: 0,
          streak: 0,
          correct: 0,
          connected: true,
        },
      ],
    },
  };
}

export const setConnected = (
  state: RoomState,
  id: string,
  connected: boolean,
): RoomState => ({
  ...state,
  players: state.players.map((p) => (p.id === id ? { ...p, connected } : p)),
});

export const removePlayer = (state: RoomState, id: string): RoomState => ({
  ...state,
  players: state.players.filter((p) => p.id !== id),
});

export function startGame(
  state: RoomState,
  questions: Question[],
  now: number,
  limitMs: number = state.limitMs,
) {
  return startQuestion(
    {
      ...state,
      questions,
      limitMs,
      index: 0,
      players: state.players.map((p) => ({
        ...p,
        score: 0,
        streak: 0,
        correct: 0,
      })),
    },
    now,
  );
}

function startQuestion(state: RoomState, now: number): RoomState {
  return {
    ...state,
    phase: "question",
    startedAt: now,
    answers: {},
    results: {},
  };
}

export function submitAnswer(
  state: RoomState,
  playerId: string,
  questionIndex: number,
  optionId: string,
  now: number,
): RoomState {
  if (state.phase !== "question" || questionIndex !== state.index) return state;
  if (!state.players.some((p) => p.id === playerId)) return state;
  if (state.answers[playerId]) return state;
  const question = state.questions[state.index];
  if (!question?.options.some((o) => o.id === optionId)) return state;
  if (hasTimeLimit(state) && now - state.startedAt > state.limitMs + 1_500)
    return state;
  return {
    ...state,
    answers: { ...state.answers, [playerId]: { optionId, at: now } },
  };
}

/** Alle tilsluttede spillere har svaret. */
export const allAnswered = (state: RoomState) => {
  const active = state.players.filter((p) => p.connected);
  return (
    state.phase === "question" &&
    active.length > 0 &&
    active.every((p) => state.answers[p.id])
  );
};

export const remainingMs = (state: RoomState, now: number) =>
  hasTimeLimit(state)
    ? Math.max(0, state.limitMs - (now - state.startedAt))
    : 0;

export function revealQuestion(state: RoomState): RoomState {
  if (state.phase !== "question") return state;
  const question = state.questions[state.index];
  const results: Record<string, RoomResult> = {};
  const players = state.players.map((player) => {
    const answer = state.answers[player.id];
    const correct =
      Boolean(answer) && answer.optionId === question.correctOptionId;
    const points = answer
      ? roomPoints(
          correct,
          answer.at - state.startedAt,
          state.limitMs,
          player.streak,
        )
      : 0;
    results[player.id] = { correct, answered: Boolean(answer), points };
    return {
      ...player,
      score: player.score + points,
      streak: correct ? player.streak + 1 : 0,
      correct: player.correct + (correct ? 1 : 0),
    };
  });
  return { ...state, phase: "reveal", players, results };
}

export function nextQuestion(state: RoomState, now: number): RoomState {
  if (state.phase !== "reveal") return state;
  if (state.index >= state.questions.length - 1)
    return { ...state, phase: "end" };
  return startQuestion({ ...state, index: state.index + 1 }, now);
}

export const backToLobby = (state: RoomState): RoomState => ({
  ...state,
  phase: "lobby",
  questions: [],
  index: 0,
  answers: {},
  results: {},
});

/** Point først; ved lighed vinder flest rigtige, derefter navnet. */
export function standings(
  state: RoomState,
): (RoomStanding & { rank: number })[] {
  const sorted = [...state.players].sort(
    (a, b) =>
      b.score - a.score ||
      b.correct - a.correct ||
      a.name.localeCompare(b.name),
  );
  let rank = 0;
  return sorted.map((p, i) => {
    if (i === 0 || p.score !== sorted[i - 1].score) rank = i + 1;
    return { id: p.id, name: p.name, avatar: p.avatar, score: p.score, rank };
  });
}

/** Fordeling af svar på den aktuelle sides svarmuligheder. */
export function answerCounts(state: RoomState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const answer of Object.values(state.answers))
    counts[answer.optionId] = (counts[answer.optionId] ?? 0) + 1;
  return counts;
}
