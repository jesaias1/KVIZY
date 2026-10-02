import type { GameResult } from "./types";

export type CategoryStat = {
  categoryId: string;
  correct: number;
  total: number;
  rate: number;
};
export type LevelStat = { level: number; correct: number; total: number };
export type Stats = {
  games: number;
  answers: number;
  correct: number;
  rate: number;
  bestStreak: number;
  categories: CategoryStat[];
  levels: LevelStat[];
  /** Sandt, når statistikken kun bygger på solospil. */
  soloOnly: boolean;
};

/**
 * Samler statistik fra historikken. Solospil tæller alene, når der findes
 * nogen, så en enkelt spillers tal ikke blandes med resten af selskabet.
 */
export function computeStats(history: GameResult[]): Stats {
  const solo = history.filter((result) => result.players.length === 1);
  const used = solo.length > 0 ? solo : history;
  const byCategory = new Map<string, { correct: number; total: number }>();
  const byLevel = new Map<number, { correct: number; total: number }>();
  let answers = 0;
  let correct = 0;
  let bestStreak = 0;

  for (const result of used) {
    const difficultyById = new Map(
      result.questions.map((question) => [question.id, question.difficulty]),
    );
    for (const player of result.players)
      bestStreak = Math.max(bestStreak, player.longestStreak);
    for (const answer of result.answers) {
      answers++;
      if (answer.correct) correct++;
      const category = byCategory.get(answer.categoryId) ?? {
        correct: 0,
        total: 0,
      };
      category.total++;
      if (answer.correct) category.correct++;
      byCategory.set(answer.categoryId, category);
      const level = difficultyById.get(answer.questionId);
      if (level) {
        const entry = byLevel.get(level) ?? { correct: 0, total: 0 };
        entry.total++;
        if (answer.correct) entry.correct++;
        byLevel.set(level, entry);
      }
    }
  }

  return {
    games: used.length,
    answers,
    correct,
    rate: answers > 0 ? correct / answers : 0,
    bestStreak,
    soloOnly: solo.length > 0,
    categories: [...byCategory].map(([categoryId, value]) => ({
      categoryId,
      ...value,
      rate: value.correct / value.total,
    })),
    levels: [1, 2, 3, 4, 5]
      .map((level) => ({ level, ...(byLevel.get(level) ?? { correct: 0, total: 0 }) }))
      .filter((entry) => entry.total > 0),
  };
}

/** De kategorier, hvor spilleren oftest svarer forkert. */
export function weakestCategories(stats: Stats, count = 4, minAnswers = 3) {
  return stats.categories
    .filter((category) => category.total >= minAnswers && category.rate < 1)
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
    .slice(0, count)
    .map((category) => category.categoryId);
}
