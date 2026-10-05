import type { Game } from "./types";

export type Counters = {
  games: number;
  answered: number;
  correct: number;
  perfectRounds: number;
  hardCorrect: number;
  partyGames: number;
  blitzBest: number;
  dailyStreakBest: number;
};

export type AchievementState = {
  counters: Counters;
  /** Id → dato (ISO) for, hvornår præstationen blev låst op. */
  unlocked: Record<string, string>;
};

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  text: string;
  goal: number;
  value: (c: Counters) => number;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first",
    emoji: "🎬",
    title: "Første runde",
    text: "Spil dit første spil",
    goal: 1,
    value: (c) => c.games,
  },
  {
    id: "regular",
    emoji: "🔁",
    title: "Stamgæst",
    text: "Spil 10 spil",
    goal: 10,
    value: (c) => c.games,
  },
  {
    id: "veteran",
    emoji: "🛋️",
    title: "Fast inventar",
    text: "Spil 50 spil",
    goal: 50,
    value: (c) => c.games,
  },
  {
    id: "hundred",
    emoji: "💯",
    title: "Hundrede rigtige",
    text: "Svar rigtigt 100 gange",
    goal: 100,
    value: (c) => c.correct,
  },
  {
    id: "fivehundred",
    emoji: "🧠",
    title: "Hjerne på overarbejde",
    text: "Svar rigtigt 500 gange",
    goal: 500,
    value: (c) => c.correct,
  },
  {
    id: "perfect",
    emoji: "✨",
    title: "Fuldt hus",
    text: "Få alt rigtigt i en solorunde med mindst 8 spørgsmål",
    goal: 1,
    value: (c) => c.perfectRounds,
  },
  {
    id: "hard",
    emoji: "🧗",
    title: "Svære knaster",
    text: "Svar rigtigt på 25 svære spørgsmål",
    goal: 25,
    value: (c) => c.hardCorrect,
  },
  {
    id: "party",
    emoji: "🎉",
    title: "Selskabsløve",
    text: "Spil 5 spil med flere spillere",
    goal: 5,
    value: (c) => c.partyGames,
  },
  {
    id: "blitz10",
    emoji: "⚡",
    title: "Lynhurtig",
    text: "Få 10 rigtige i en lynrunde",
    goal: 10,
    value: (c) => c.blitzBest,
  },
  {
    id: "blitz20",
    emoji: "🌩️",
    title: "Lynnedslag",
    text: "Få 20 rigtige i en lynrunde",
    goal: 20,
    value: (c) => c.blitzBest,
  },
  {
    id: "daily3",
    emoji: "📅",
    title: "Dagens vane",
    text: "Klar Dagens quiz 3 dage i træk",
    goal: 3,
    value: (c) => c.dailyStreakBest,
  },
  {
    id: "daily7",
    emoji: "🔥",
    title: "Ugens quiz",
    text: "Klar Dagens quiz 7 dage i træk",
    goal: 7,
    value: (c) => c.dailyStreakBest,
  },
];

export const emptyAchievementState = (): AchievementState => ({
  counters: {
    games: 0,
    answered: 0,
    correct: 0,
    perfectRounds: 0,
    hardCorrect: 0,
    partyGames: 0,
    blitzBest: 0,
    dailyStreakBest: 0,
  },
  unlocked: {},
});

/** Tolerant indlæsning: manglende eller beskadigede felter bliver til nul. */
export function sanitizeAchievementState(raw: unknown): AchievementState {
  const base = emptyAchievementState();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<AchievementState>;
  for (const key of Object.keys(base.counters) as (keyof Counters)[]) {
    const n = Number(value.counters?.[key]);
    if (Number.isFinite(n) && n >= 0) base.counters[key] = n;
  }
  if (value.unlocked && typeof value.unlocked === "object")
    for (const [id, at] of Object.entries(value.unlocked))
      if (typeof at === "string") base.unlocked[id] = at;
  return base;
}

/**
 * Tæller et færdigt spil med og returnerer den nye tilstand samt de
 * præstationer, der netop blev låst op.
 */
export function applyGame(
  state: AchievementState,
  game: Game,
  options: { dailyStreak?: number; now?: string } = {},
): { state: AchievementState; newlyUnlocked: Achievement[] } {
  const counters = { ...state.counters };
  const byId = new Map(game.questions.map((q) => [q.id, q]));
  const correct = game.answers.filter((a) => a.correct);
  counters.games += 1;
  counters.answered += game.answers.length;
  counters.correct += correct.length;
  counters.hardCorrect += correct.filter(
    (a) => (byId.get(a.questionId)?.difficulty ?? 0) >= 4,
  ).length;
  const solo = game.setup.players.length === 1;
  if (!solo) counters.partyGames += 1;
  if (
    solo &&
    !game.practice &&
    game.setup.mode !== "blitz" &&
    game.answers.length >= 8 &&
    correct.length === game.answers.length
  )
    counters.perfectRounds += 1;
  if (game.setup.mode === "blitz")
    counters.blitzBest = Math.max(counters.blitzBest, correct.length);
  if (options.dailyStreak)
    counters.dailyStreakBest = Math.max(
      counters.dailyStreakBest,
      options.dailyStreak,
    );
  const unlocked = { ...state.unlocked };
  const newlyUnlocked: Achievement[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (unlocked[achievement.id]) continue;
    if (achievement.value(counters) >= achievement.goal) {
      unlocked[achievement.id] = options.now ?? new Date().toISOString();
      newlyUnlocked.push(achievement);
    }
  }
  return { state: { counters, unlocked }, newlyUnlocked };
}
