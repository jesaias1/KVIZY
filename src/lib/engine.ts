import type {
  Game,
  GamePlayer,
  GameResult,
  GameSetup,
  Question,
  SeenQuestion,
} from "./types";
import { effectiveQualityScore } from "./question-quality";

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
function tokenSet(value: string) {
  return new Set(normalizeText(value).split(" "));
}
function setSimilarity(a: Set<string>, b: Set<string>) {
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  return intersection / (a.size + b.size - intersection || 1);
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
  timeBonus: boolean,
  multiplier = 1,
  minus = false,
  finale = false,
) {
  const base = 1000 * (finale ? 2 : 1) * multiplier;
  if (correct) {
    const bonus = timeBonus
      ? Math.max(0, Math.round((1 - responseMs / 30000) * 500))
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
) {
  const correct = answerIsCorrect(question, answer);
  if (question.type !== "closest_wins")
    return calculatePoints(
      correct,
      responseMs,
      timeBonus,
      multiplier,
      minus,
      Boolean(question.finale || question.type === "finale"),
    );
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
  const base = [1000, 700, 400, 200][rank] ?? 0;
  const finale = question.finale ? 2 : 1;
  if (chosen === undefined || target === undefined) return 0;
  return base * multiplier * finale;
}

const FAIR_TURN_TYPES = ["true_false", "ordering"] as const;

function balanceFairTurnTypes(
  picked: Question[],
  eligibleBank: Question[],
  setup: GameSetup,
  signatures: Map<string, Set<string>>,
  qualityScores: Map<string, number>,
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
      const replacement = eligibleBank
        .filter(
          (candidate) =>
            !fairTypes.has(candidate.type) &&
            !currentIds.has(candidate.id) &&
            !balanced.some(
              (question, index) =>
                index !== replaceIndex &&
                (question.fingerprint === candidate.fingerprint ||
                  setSimilarity(
                    signatures.get(question.id)!,
                    signatures.get(candidate.id)!,
                  ) > 0.9),
            ),
        )
        .sort(
          (a, b) =>
            Math.abs(a.difficulty - balanced[replaceIndex].difficulty) * 10 -
            (qualityScores.get(a.id) ?? 0) * 0.08 -
            (Math.abs(b.difficulty - balanced[replaceIndex].difficulty) * 10 -
              (qualityScores.get(b.id) ?? 0) * 0.08),
        )[0];
      if (replacement) balanced[replaceIndex] = replacement;
      else balanced.splice(replaceIndex, 1);
    }
  }

  const distributed: Array<Question | undefined> = Array(balanced.length);
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
    ? ordered
    : balanced;
}

export function selectQuestions(
  bank: Question[],
  setup: GameSetup,
  seen: SeenQuestion[] = [],
  random = Math.random,
): Question[] {
  const seenMap = new Map(seen.map((s) => [s.id, s]));
  const randomizedBank = shuffle(bank, random).filter(
    (question) =>
      question.status === "active" &&
      setup.categoryIds.includes(question.categoryId),
  );
  const qualityScores = new Map(
    randomizedBank.map((question) => [
      question.id,
      effectiveQualityScore(question),
    ]),
  );
  const signatures = new Map(
    randomizedBank.map((question) => [
      question.id,
      tokenSet(
        `${question.prompt} ${question.options.find((option) => option.id === question.correctOptionId)?.text ?? ""}`,
      ),
    ]),
  );
  const picked: Question[] = [];
  const pickedIds = new Set<string>();
  const pickedFingerprints = new Set<string>();
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
          !pickedIds.has(q.id) &&
          !pickedFingerprints.has(q.fingerprint) &&
          !picked.some(
            (pickedQuestion) =>
              setSimilarity(
                signatures.get(pickedQuestion.id)!,
                signatures.get(q.id)!,
              ) > 0.9,
          ),
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
          (qualityScores.get(a.id) ?? 0) * 0.08 -
          (bf +
            (bs ? 100 + bs.count * 8 : 0) +
            Math.abs(b.difficulty - target) * 10 -
            (qualityScores.get(b.id) ?? 0) * 0.08)
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
    picked.push(chosen);
    pickedIds.add(chosen.id);
    pickedFingerprints.add(chosen.fingerprint);
  }
  const distributed = balanceFairTurnTypes(
    picked,
    randomizedBank,
    setup,
    signatures,
    qualityScores,
  );
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
