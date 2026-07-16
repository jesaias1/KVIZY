import type {
  Game,
  GamePlayer,
  GameResult,
  GameSetup,
  Question,
  SeenQuestion,
} from "./types";
import { effectiveQualityScore } from "./question-quality";
import { ANIMAL_AVATARS } from "./config";

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

export function rankPlayers<T extends Pick<GamePlayer, "score">>(players: T[]) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((player, index) => ({
    player,
    rank:
      index > 0 && player.score === sorted[index - 1].score
        ? sorted.findIndex((item) => item.score === player.score) + 1
        : index + 1,
  }));
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
  timeBonus: boolean,
  multiplier = 1,
  minus = false,
  finale = false,
) {
  const base = 100 * (finale ? 2 : 1) * multiplier;
  if (correct) {
    const bonus = timeBonus
      ? Math.max(0, Math.round((1 - responseMs / 30000) * 50))
      : 0;
    return base + bonus;
  }
  return minus || multiplier > 1 ? -Math.round(base / 2) : 0;
}
export function answerIsCorrect(question: Question, answer: string) {
  if (question.type === "ordering")
    return answer === (question.correctOrder ?? []).join("|");
  return answer === question.correctOptionId;
}

function numericOption(question: Question, optionId: string) {
  const text = question.options.find((option) => option.id === optionId)?.text;
  if (!text) return undefined;
  const value = Number(text.replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

export function calculateQuestionPoints(
  question: Question,
  answer: string,
  responseMs: number,
  timeBonus: boolean,
  multiplier = 1,
  minus = false,
  streak = 0,
  streakBonus = false,
) {
  const correct = answerIsCorrect(question, answer);
  if (question.type !== "closest_wins") {
    const points = calculatePoints(
      correct,
      responseMs,
      timeBonus,
      multiplier,
      minus,
      Boolean(question.finale || question.type === "finale"),
    );
    return correct && streakBonus
      ? points + Math.min(3, Math.max(0, streak)) * 25
      : points;
  }
  const chosen = numericOption(question, answer);
  const target = numericOption(question, question.correctOptionId ?? "");
  const distances = question.options
    .map((option) => ({
      id: option.id,
      distance:
        target === undefined || numericOption(question, option.id) === undefined
          ? Number.POSITIVE_INFINITY
          : Math.abs(numericOption(question, option.id)! - target),
    }))
    .sort((a, b) => a.distance - b.distance);
  const rank = distances.findIndex((item) => item.id === answer);
  const base = [100, 70, 40, 20][rank] ?? 0;
  const finale = question.finale ? 2 : 1;
  if (chosen === undefined || target === undefined) return 0;
  return base * multiplier * finale;
}

const FAIR_TURN_TYPES = ["true_false", "ordering"] as const;

function spreadFairTypes(questions: Question[], playerCount: number) {
  const spread = [...questions];
  const fairTypes = new Set<Question["type"]>(FAIR_TURN_TYPES);

  // Swap only within the same player's turns. That keeps the per-player
  // distribution fair while moving identical special types apart.
  for (let pass = 0; pass < 2; pass++) {
    for (let index = 1; index < spread.length; index++) {
      const repeatedType = spread[index].type;
      if (
        !fairTypes.has(repeatedType) ||
        spread[index - 1].type !== repeatedType
      )
        continue;
      for (
        let swapIndex = index + playerCount;
        swapIndex < spread.length;
        swapIndex += playerCount
      ) {
        const candidateType = spread[swapIndex].type;
        if (
          candidateType === repeatedType ||
          spread[index + 1]?.type === candidateType ||
          spread[swapIndex - 1]?.type === repeatedType ||
          spread[swapIndex + 1]?.type === repeatedType
        )
          continue;
        [spread[index], spread[swapIndex]] = [
          spread[swapIndex],
          spread[index],
        ];
        break;
      }
    }
  }
  return spread;
}

function questionFactKey(question: Question) {
  if (question.type === "true_false") return question.fingerprint;
  const answer =
    question.options.find(
      (option) => option.id === question.correctOptionId,
    )?.text ??
    (question.correctOrder ?? [])
      .map(
        (id) => question.options.find((option) => option.id === id)?.text ?? id,
      )
      .join(" ");
  return `${question.categoryId}:${normalizeText(answer)}:${question.tags[0] ?? ""}`;
}

function balanceFairTurnTypes(
  picked: Question[],
  eligibleBank: Question[],
  setup: GameSetup,
) {
  const playerCount = Math.max(1, setup.players.length);
  if (playerCount === 1 || picked.length < playerCount) return picked;

  const fairTypes = new Set<Question["type"]>(FAIR_TURN_TYPES);
  const balanced = [...picked];

  // En fair type må kun optræde i hele spiller-sæt. Eventuelle rester
  // erstattes med almindelige spørgsmål fra de samme valgte kategorier.
  for (const type of FAIR_TURN_TYPES) {
    const typeIndexes = balanced
      .map((question, index) => (question.type === type ? index : -1))
      .filter((index) => index >= 0);
    const remainder = typeIndexes.length % playerCount;
    if (remainder === 0) continue;
    for (const replaceIndex of [...typeIndexes.slice(-remainder)].reverse()) {
      const currentIds = new Set(balanced.map((question) => question.id));
      const currentFingerprints = new Set(
        balanced
          .filter((_, index) => index !== replaceIndex)
          .map((question) => question.fingerprint),
      );
      const currentFacts = new Set(
        balanced
          .filter((_, index) => index !== replaceIndex)
          .map(questionFactKey),
      );
      const replacement = eligibleBank.find(
        (candidate) =>
          !fairTypes.has(candidate.type) &&
          !currentIds.has(candidate.id) &&
          !currentFingerprints.has(candidate.fingerprint) &&
          !currentFacts.has(questionFactKey(candidate)),
      );
      if (replacement) balanced[replaceIndex] = replacement;
      else balanced.splice(replaceIndex, 1);
    }
  }

  // Array(length) creates empty slots that Array.prototype.map skips.
  // Initialize every slot so the remaining questions are actually inserted.
  const distributed: Array<Question | undefined> = Array.from(
    { length: balanced.length },
    () => undefined,
  );
  const openSlots = Array.from({ length: playerCount }, (_, playerIndex) =>
    balanced
      .map((_, index) => index)
      .filter((index) => index % playerCount === playerIndex),
  );
  const placedIds = new Set<string>();

  for (const type of FAIR_TURN_TYPES) {
    const questions = balanced.filter((question) => question.type === type);
    const perPlayer = Math.floor(questions.length / playerCount);
    let questionIndex = 0;
    for (let round = 0; round < perPlayer; round++) {
      for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
        const slots = openSlots[playerIndex];
        const slotOffset = Math.min(
          slots.length - 1,
          Math.floor(((round + 1) / (perPlayer + 1)) * slots.length),
        );
        const [slot] = slots.splice(Math.max(0, slotOffset), 1);
        const question = questions[questionIndex++];
        if (slot !== undefined && question) {
          distributed[slot] = question;
          placedIds.add(question.id);
        }
      }
    }
  }

  const remaining = balanced.filter((question) => !placedIds.has(question.id));
  let remainingIndex = 0;
  const ordered = distributed.map(
    (question) => question ?? remaining[remainingIndex++],
  );
  return ordered.every((question): question is Question => Boolean(question))
    ? spreadFairTypes(ordered, playerCount)
    : balanced;
}

export function selectQuestions(
  bank: Question[],
  setup: GameSetup,
  seen: SeenQuestion[] = [],
  random = Math.random,
): Question[] {
  const seenMap = new Map(seen.map((s) => [s.id, s]));
  const eligibleBank = shuffle(bank, random).filter(
    (question) =>
      question.status === "active" &&
      setup.categoryIds.includes(question.categoryId),
  );
  const candidatePool = eligibleBank;
  const picked: Question[] = [];
  const pickedIds = new Set<string>();
  const pickedFingerprints = new Set<string>();
  const pickedFacts = new Set<string>();
  const categoryCounts = new Map<string, number>();
  const selectedCategoryFor = (question: Question) => question.categoryId;
  for (let i = 0; i < setup.questionCount; i++) {
    const target = difficultyFor(
      i,
      setup.questionCount,
      setup.difficulty,
      setup.difficultyMode,
    );
    const recentTypes = picked.slice(-2).map((q) => q.type),
      recentCats = picked.slice(-2).map((q) => q.categoryId);
    let chosen: Question | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    const chooseFromPool = (allowRepeatedFact: boolean) => {
      for (const question of candidatePool) {
        const factKey = questionFactKey(question);
        if (
          pickedIds.has(question.id) ||
          pickedFingerprints.has(question.fingerprint) ||
          (!allowRepeatedFact && pickedFacts.has(factKey))
        )
          continue;
        const seen = seenMap.get(question.id);
        const selectedCategory = selectedCategoryFor(question);
        const repeatedType =
          recentTypes.length === 2 &&
          recentTypes.every((type) => type === question.type);
        const repeatedCategory =
          recentCats.length === 2 &&
          recentCats.every((category) => category === question.categoryId);
        const score =
          (setup.favorites.includes(selectedCategory) ? -30 : 0) +
          (seen ? 100 + seen.count * 8 : 0) +
          Math.abs(question.difficulty - target) * 10 +
          (categoryCounts.get(selectedCategory) ?? 0) * 45 +
          (repeatedType ? 40 : 0) +
          (repeatedCategory ? 40 : 0) -
          effectiveQualityScore(question) * 0.08;
        if (score < bestScore) {
          bestScore = score;
          chosen = question;
        }
      }
    };
    chooseFromPool(false);
    if (!chosen) chooseFromPool(true);
    if (!chosen) break;
    picked.push(chosen);
    pickedIds.add(chosen.id);
    pickedFingerprints.add(chosen.fingerprint);
    pickedFacts.add(questionFactKey(chosen));
    const selectedCategory = selectedCategoryFor(chosen);
    categoryCounts.set(
      selectedCategory,
      (categoryCounts.get(selectedCategory) ?? 0) + 1,
    );
  }
  const distributed = balanceFairTurnTypes(picked, candidatePool, setup);
  return distributed.map((question, index) => {
    const shuffled = shuffleAnswers(question, random);
    return setup.finale && index >= Math.max(0, distributed.length - 3)
      ? {
          ...shuffled,
          finale: true,
          difficulty: Math.min(5, shuffled.difficulty + 1),
        }
      : shuffled;
  });
}
export function newPlayer(name: string, index: number): GamePlayer {
  return {
    id: crypto.randomUUID(),
    name,
    avatar: ANIMAL_AVATARS[index % ANIMAL_AVATARS.length],
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
