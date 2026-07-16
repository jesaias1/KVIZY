import type {
  Game,
  GamePlayer,
  GameResult,
  GameSetup,
  Question,
  SeenQuestion,
} from "./types";

export function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("da")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function stableHash(value: string) {
  let h = 2166136261;
  for (const ch of normalizeText(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
export function fingerprint(prompt: string, answer: string, type: string) {
  const tokens = normalizeText(`${prompt} ${answer} ${type}`)
    .split(" ")
    .filter((x) => x.length > 3)
    .sort();
  return stableHash(tokens.join(" "));
}
export function similarity(a: string, b: string) {
  const A = new Set(normalizeText(a).split(" ")),
    B = new Set(normalizeText(b).split(" "));
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
}
export function isNearDuplicate(a: Question, b: Question) {
  return (
    a.fingerprint === b.fingerprint ||
    similarity(
      `${a.prompt} ${a.options.find((o) => o.id === a.correctOptionId)?.text}`,
      `${b.prompt} ${b.options.find((o) => o.id === b.correctOptionId)?.text}`,
    ) > 0.9
  );
}
export function shuffle<T>(items: T[], random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function shuffleAnswers(q: Question, random = Math.random): Question {
  if (q.type === "ordering") return q;
  return { ...q, options: shuffle(q.options, random) };
}
export function difficultyFor(
  index: number,
  total: number,
  base: number,
  mode: GameSetup["difficultyMode"],
) {
  if (mode === "mixed")
    return Math.max(1, Math.min(5, base + ((index % 3) - 1)));
  if (mode === "rising")
    return Math.max(
      1,
      Math.min(
        5,
        Math.round(
          Math.max(1, base - 1) + (index / Math.max(1, total - 1)) * 2,
        ),
      ),
    );
  return base;
}
export function calculatePoints(
  correct: boolean,
  responseMs: number,
  timer: boolean,
  multiplier = 1,
  minus = false,
  finale = false,
) {
  const base = 1000 * (finale ? 2 : 1) * multiplier;
  if (correct) {
    const bonus = timer
      ? Math.max(0, Math.round((1 - responseMs / 30000) * 500))
      : 0;
    return base + bonus;
  }
  return minus || multiplier > 1 ? -Math.round(base / 2) : 0;
}
export function selectQuestions(
  bank: Question[],
  setup: GameSetup,
  seen: SeenQuestion[] = [],
  random = Math.random,
): Question[] {
  const seenMap = new Map(seen.map((s) => [s.id, s]));
  const randomizedBank = shuffle(bank, random);
  const picked: Question[] = [];
  for (let i = 0; i < setup.questionCount; i++) {
    const target = difficultyFor(
      i,
      setup.questionCount,
      setup.difficulty,
      setup.difficultyMode,
    );
    const candidates = randomizedBank
      .filter(
        (q) =>
          q.status === "active" &&
          setup.categoryIds.includes(q.categoryId) &&
          !picked.some((p) => p.id === q.id || isNearDuplicate(p, q)),
      )
      .sort((a, b) => {
        const af = setup.favorites.includes(a.categoryId) ? -20 : 0,
          bf = setup.favorites.includes(b.categoryId) ? -20 : 0;
        const as = seenMap.get(a.id),
          bs = seenMap.get(b.id);
        return (
          af +
          (as ? 100 + as.count * 8 : 0) +
          Math.abs(a.difficulty - target) * 10 -
          (bf +
            (bs ? 100 + bs.count * 8 : 0) +
            Math.abs(b.difficulty - target) * 10)
        );
      });
    const recentTypes = picked.slice(-2).map((q) => q.type),
      recentCats = picked.slice(-2).map((q) => q.categoryId);
    const chosen =
      candidates.find(
        (q) =>
          !(
            recentTypes.length === 2 && recentTypes.every((t) => t === q.type)
          ) &&
          !(
            recentCats.length === 2 &&
            recentCats.every((c) => c === q.categoryId)
          ),
      ) ?? candidates[0];
    if (!chosen) break;
    picked.push(shuffleAnswers(chosen, random));
  }
  return picked.map((q, i) =>
    setup.finale && i >= Math.max(0, picked.length - 3)
      ? { ...q, type: "finale", difficulty: Math.min(5, q.difficulty + 1) }
      : q,
  );
}
export function newPlayer(name: string, index: number): GamePlayer {
  return {
    id: crypto.randomUUID(),
    name,
    avatar: ["🦊", "🐻", "🦉", "🐼", "🦁", "🐙"][index % 6],
    color: ["#ff6b35", "#35c2a6", "#7c6cff", "#e6b84b"][index % 4],
    score: 0,
    correct: 0,
    answers: 0,
    streak: 0,
    longestStreak: 0,
  };
}
export function buildResult(game: Game): GameResult {
  return {
    id: game.id,
    playedAt: new Date().toISOString(),
    setup: game.setup,
    players: game.setup.players,
    answers: game.answers,
    questions: game.questions,
  };
}
