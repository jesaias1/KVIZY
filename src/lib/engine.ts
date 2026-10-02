import type {
  Game,
  GamePlayer,
  GameResult,
  GameSetup,
  Question,
  SeenQuestion,
} from "./types";
import {
  effectiveQualityScore,
  questionOptionSetKey,
} from "./question-quality";
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
  random = Math.random,
) {
  const minimum = Math.max(1, base - 1);
  const maximum = Math.min(5, base + 1);
  const clamp = (value: number) => Math.max(minimum, Math.min(maximum, value));
  if (mode === "mixed")
    return clamp(base + [-1, 0, 0, 0, 1][Math.floor(random() * 5)]);
  if (mode === "rising")
    return clamp(
      Math.round(Math.max(1, base - 1) + (index / Math.max(1, total - 1)) * 2),
    );
  return base;
}

export function difficultyPlan(
  total: number,
  base: number,
  mode: GameSetup["difficultyMode"],
  random = Math.random,
) {
  if (mode !== "mixed" || total < 3)
    return Array.from({ length: total }, (_, index) =>
      difficultyFor(index, total, base, mode, random),
    );

  const lower = Math.max(1, base - 1);
  const upper = Math.min(5, base + 1);
  const sideCount = Math.max(1, Math.round(total * 0.2));
  const plan = Array.from({ length: total }, () => base);
  let cursor = 0;
  if (lower !== base) {
    plan.fill(lower, cursor, Math.min(total, cursor + sideCount));
    cursor += sideCount;
  }
  if (upper !== base) {
    plan.fill(upper, cursor, Math.min(total, cursor + sideCount));
  }
  return shuffle(plan, random);
}

export function fairQuestionCounts(playerCount: number) {
  const players = Math.max(1, Math.min(90, Math.floor(playerCount)));
  const multiples = Array.from(
    { length: Math.floor(90 / players) },
    (_, index) => (index + 1) * players,
  );
  const closest = (target: number) =>
    [...multiples].sort(
      (left, right) =>
        Math.abs(left - target) - Math.abs(right - target) || right - left,
    )[0];
  return [
    ...new Set(
      Array.from({ length: 9 }, (_, index) => closest((index + 1) * 10)),
    ),
  ].sort((left, right) => left - right);
}

export function closestFairQuestionCount(count: number, playerCount: number) {
  const choices = fairQuestionCounts(playerCount);
  return [...choices].sort(
    (left, right) =>
      Math.abs(left - count) - Math.abs(right - count) || right - left,
  )[0];
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
        [spread[index], spread[swapIndex]] = [spread[swapIndex], spread[index]];
        break;
      }
    }
  }
  return spread;
}

const factKeyCache = new WeakMap<Question, string>();

function questionFactKey(question: Question) {
  const cached = factKeyCache.get(question);
  if (cached) return cached;
  if (question.type === "true_false") return question.fingerprint;
  const answer =
    question.options.find((option) => option.id === question.correctOptionId)
      ?.text ??
    (question.correctOrder ?? [])
      .map(
        (id) => question.options.find((option) => option.id === id)?.text ?? id,
      )
      .join(" ");
  const key = `${question.categoryId}:${normalizeText(answer)}:${question.tags[0] ?? ""}`;
  factKeyCache.set(question, key);
  return key;
}

const REPETITIVE_TEMPLATE_TAGS = new Set([
  "capital",
  "currency",
  "continent",
  "language",
  "callingCode",
  "tld",
  "painting-artist",
  "film-director",
  "series-creator",
  "building-architect",
  "danish-film-director",
  "danish-literature-author",
  "danish-series-creator",
  "athlete-sport",
  "football-club-stadium",
  "album-artist",
  "philosopher-movement",
  "psychologist-field",
]);
const CREATOR_ATTRIBUTION_TAGS = new Set([
  "painting-artist",
  "film-director",
  "series-creator",
  "building-architect",
  "danish-film-director",
  "danish-literature-author",
  "danish-series-creator",
  "album-artist",
  "novel-author",
  "danish-song-performer",
]);
const COUNTRY_LOOKUP_TAGS = new Set([
  "capital",
  "currency",
  "continent",
  "language",
  "callingCode",
  "tld",
]);

const SPECIALIST_CATEGORY_IDS = new Set([
  "cat-11",
  "cat-13",
  "cat-14",
  "cat-23",
  "cat-31",
  "cat-32",
  "cat-33",
  "cat-37",
  "cat-39",
  "cat-44",
  "cat-58",
  "cat-60",
  "cat-61",
]);
const REPEAT_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1_000;

export function isGeneralKnowledgeQuestion(question: Question) {
  return (
    question.categoryId === "cat-1" ||
    question.categoryId === "cat-59" ||
    question.tags.includes("hverdagsforklaring") ||
    (question.tags.includes("varieret") &&
      question.categoryId !== "cat-23" &&
      question.type !== "ordering" &&
      question.type !== "true_false" &&
      question.difficulty <= 3)
  );
}

function matchesSelectedUmbrellaCategory(
  question: Question,
  selectedCategoryIds: Set<string>,
) {
  // Emnefiltre skal være strikte i blandede spil. Formkategorierne må kun
  // hente spørgsmål fra andre emner, når brugeren har valgt dem helt alene.
  if (selectedCategoryIds.size !== 1) return false;
  return (
    (selectedCategoryIds.has("cat-1") &&
      isGeneralKnowledgeQuestion(question)) ||
    (selectedCategoryIds.has("cat-45") &&
      ["what_came_first", "ordering"].includes(question.type)) ||
    (selectedCategoryIds.has("cat-46") &&
      ["odd_one_out", "incorrect_statement"].includes(question.type)) ||
    (selectedCategoryIds.has("cat-47") && question.type === "true_false")
  );
}

// De håndskrevne spørgsmål kan dele et emne, fx «matador» eller «em92».
// To spørgsmål om samme emne i ét spil føles som en gentagelse, og det ene
// kan desuden komme til at afsløre svaret på det andet.
export function questionTopicKey(question: Question) {
  if (!question.tags.includes("kurateret-2026")) return undefined;
  const topic = question.tags[0];
  return topic && topic !== "kurateret" ? topic : undefined;
}

const templateKeyCache = new WeakMap<Question, string | undefined>();

export function questionTemplateKey(question: Question) {
  if (templateKeyCache.has(question)) return templateKeyCache.get(question);
  let key: string | undefined;
  if (
    question.tags.includes("redaktionel-matrix") ||
    question.tags.includes("redaktionel-æra")
  )
    key = `${question.tags[0]}:${question.tags[1] ?? "ukendt"}`;
  else if (/gutenberg|bogtryk|trykpresse/iu.test(question.prompt))
    key = "printing-press";
  else if (question.tags.some((tag) => CREATOR_ATTRIBUTION_TAGS.has(tag)))
    key = "creator-attribution";
  else if (question.tags.some((tag) => COUNTRY_LOOKUP_TAGS.has(tag)))
    key = "country-lookup";
  else key = question.tags.find((tag) => REPETITIVE_TEMPLATE_TAGS.has(tag));
  templateKeyCache.set(question, key);
  return key;
}

function balanceFairTurnTypes(
  picked: Question[],
  eligibleBank: Question[],
  setup: GameSetup,
  historicallySeenIds: Set<string>,
) {
  const playerCount = Math.max(1, setup.players.length);
  if (playerCount === 1 || picked.length < playerCount) return picked;

  const fairTypes = new Set<Question["type"]>(FAIR_TURN_TYPES);
  const balanced = [...picked];
  const allowSeenFallback =
    picked.length > 0 &&
    picked.every((question) => historicallySeenIds.has(question.id));
  const isAvailableByHistory = (question: Question) =>
    allowSeenFallback || !historicallySeenIds.has(question.id);

  // I længere blandede spil skal mindst én hel spillerunde af hver fair
  // specialtype med, hvis banken kan levere den. Ellers kunne et enkelt valgt
  // sandt/falsk-spørgsmål blive fjernet under lighedsbalanceringen, så typen
  // helt forsvandt fra spillet.
  if (setup.questionCount >= playerCount * 5) {
    for (const type of FAIR_TURN_TYPES) {
      const present = balanced.filter((question) => question.type === type);
      if (present.length >= playerCount) continue;
      const usedIds = new Set(balanced.map((question) => question.id));
      const usedFingerprints = new Set(
        balanced.map((question) => question.fingerprint),
      );
      const additions = eligibleBank
        .filter(
          (candidate) =>
            candidate.type === type &&
            isAvailableByHistory(candidate) &&
            Math.abs(candidate.difficulty - setup.difficulty) <= 1 &&
            !usedIds.has(candidate.id) &&
            !usedFingerprints.has(candidate.fingerprint),
        )
        .slice(0, playerCount - present.length);
      for (const addition of additions) {
        const replaceIndex = balanced.findLastIndex(
          (question) => !fairTypes.has(question.type),
        );
        if (replaceIndex < 0) break;
        balanced[replaceIndex] = addition;
        usedIds.add(addition.id);
        usedFingerprints.add(addition.fingerprint);
      }
    }
  }

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
      const canReplace = (candidate: Question) =>
        !fairTypes.has(candidate.type) &&
        isAvailableByHistory(candidate) &&
        !currentIds.has(candidate.id) &&
        !currentFingerprints.has(candidate.fingerprint) &&
        !currentFacts.has(questionFactKey(candidate));
      const replacement =
        eligibleBank.find(
          (candidate) =>
            canReplace(candidate) && !questionTemplateKey(candidate),
        ) ?? eligibleBank.find(canReplace);
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

function difficultyBucket(question: Question) {
  return FAIR_TURN_TYPES.includes(
    question.type as (typeof FAIR_TURN_TYPES)[number],
  )
    ? question.type
    : "standard";
}

function balancePlayerDifficulties(questions: Question[], playerCount: number) {
  if (playerCount <= 1 || questions.length < playerCount) return questions;
  const balanced = [...questions];
  const turnCounts = Array.from(
    { length: playerCount },
    (_, playerIndex) =>
      balanced.filter((_, index) => index % playerCount === playerIndex).length,
  );
  const totals = () =>
    Array.from({ length: playerCount }, (_, playerIndex) =>
      balanced.reduce(
        (sum, question, index) =>
          index % playerCount === playerIndex ? sum + question.difficulty : sum,
        0,
      ),
    );
  const score = (totalsByPlayer: number[]) => {
    const values = totalsByPlayer.map(
      (total, playerIndex) => total / Math.max(1, turnCounts[playerIndex]),
    );
    const average =
      values.reduce((sum, value) => sum + value, 0) / values.length;
    return (
      (Math.max(...values) - Math.min(...values)) * 1_000 +
      values.reduce((sum, value) => sum + (value - average) ** 2, 0)
    );
  };

  for (let pass = 0; pass < 100; pass++) {
    const currentTotals = totals();
    let bestScore = score(currentTotals);
    let bestSwap: [number, number] | undefined;
    for (let left = 0; left < balanced.length; left++) {
      for (let right = left + 1; right < balanced.length; right++) {
        const leftPlayer = left % playerCount;
        const rightPlayer = right % playerCount;
        if (
          leftPlayer === rightPlayer ||
          difficultyBucket(balanced[left]) !== difficultyBucket(balanced[right])
        )
          continue;
        const leftDifficulty = balanced[left].difficulty;
        const rightDifficulty = balanced[right].difficulty;
        if (leftDifficulty === rightDifficulty) continue;
        const candidateTotals = [...currentTotals];
        candidateTotals[leftPlayer] += rightDifficulty - leftDifficulty;
        candidateTotals[rightPlayer] += leftDifficulty - rightDifficulty;
        const candidateScore = score(candidateTotals);
        if (candidateScore < bestScore) {
          bestScore = candidateScore;
          bestSwap = [left, right];
        }
      }
    }
    if (!bestSwap) break;
    [balanced[bestSwap[0]], balanced[bestSwap[1]]] = [
      balanced[bestSwap[1]],
      balanced[bestSwap[0]],
    ];
  }
  return balanced;
}

function spreadCategoriesAcrossTurns(
  questions: Question[],
  playerCount: number,
) {
  if (
    questions.length < 3 ||
    new Set(questions.map((question) => question.categoryId)).size < 2
  )
    return questions;
  const spread = [...questions];
  const players = Math.max(1, playerCount);
  if (players === 1) {
    const remaining = [...spread];
    const ordered: Question[] = [];
    while (remaining.length > 0) {
      const previous = ordered.at(-1);
      const previousTwo = new Set(
        ordered.slice(-2).map((question) => question.categoryId),
      );
      const categoryCounts = new Map<string, number>();
      for (const question of remaining) {
        categoryCounts.set(
          question.categoryId,
          (categoryCounts.get(question.categoryId) ?? 0) + 1,
        );
      }
      const hasAlternative = remaining.some(
        (question) => question.categoryId !== previous?.categoryId,
      );
      let bestIndex = 0;
      let bestScore = Number.POSITIVE_INFINITY;
      for (let index = 0; index < remaining.length; index++) {
        const candidate = remaining[index];
        if (hasAlternative && candidate.categoryId === previous?.categoryId)
          continue;
        const score =
          (previousTwo.has(candidate.categoryId) ? 100 : 0) -
          (categoryCounts.get(candidate.categoryId) ?? 0) * 20 +
          (ordered.at(-1)?.type === candidate.type &&
          ordered.at(-2)?.type === candidate.type
            ? 12
            : 0) +
          Math.abs(
            candidate.difficulty -
              (previous?.difficulty ?? candidate.difficulty),
          );
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
      ordered.push(remaining.splice(bestIndex, 1)[0]);
    }
    return ordered;
  }
  for (let index = 1; index < spread.length; index++) {
    const previousCategory = spread[index - 1]?.categoryId;
    const previousTwoCategories = new Set(
      spread
        .slice(Math.max(0, index - 2), index)
        .map((question) => question.categoryId),
    );
    if (!previousTwoCategories.has(spread[index].categoryId)) continue;

    let bestIndex = index;
    let bestScore = Number.POSITIVE_INFINITY;
    for (
      let candidateIndex = index;
      candidateIndex < spread.length;
      candidateIndex += players
    ) {
      const candidate = spread[candidateIndex];
      const categoryPenalty =
        (candidate.categoryId === previousCategory ? 1_000 : 0) +
        (previousTwoCategories.has(candidate.categoryId) ? 180 : 0);
      const typePenalty =
        spread[index - 1]?.type === candidate.type &&
        spread[index - 2]?.type === candidate.type
          ? 40
          : 0;
      const difficultyPenalty =
        Math.abs(candidate.difficulty - spread[index].difficulty) * 12;
      const distancePenalty = (candidateIndex - index) * 0.05;
      const score =
        categoryPenalty + typePenalty + difficultyPenalty + distancePenalty;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = candidateIndex;
      }
    }
    if (bestIndex !== index) {
      [spread[index], spread[bestIndex]] = [spread[bestIndex], spread[index]];
    }
  }
  return spread;
}

export function selectQuestions(
  bank: Question[],
  setup: GameSetup,
  seen: SeenQuestion[] = [],
  random = Math.random,
): Question[] {
  const seenMap = new Map(seen.map((s) => [s.id, s]));
  const seenByFingerprint = new Map<string, SeenQuestion>();
  const seenByFact = new Map<string, SeenQuestion>();
  const seenByOptionSet = new Map<string, SeenQuestion>();
  const seenByTemplate = new Map<string, SeenQuestion>();
  for (const seenQuestion of seen) {
    if (seenQuestion.fingerprint)
      seenByFingerprint.set(seenQuestion.fingerprint, seenQuestion);
    if (seenQuestion.factKey)
      seenByFact.set(seenQuestion.factKey, seenQuestion);
    if (seenQuestion.optionSetKey)
      seenByOptionSet.set(seenQuestion.optionSetKey, seenQuestion);
    if (seenQuestion.templateKey)
      seenByTemplate.set(seenQuestion.templateKey, seenQuestion);
  }
  for (const question of bank) {
    const seenQuestion = seenMap.get(question.id);
    if (!seenQuestion) continue;
    seenByFingerprint.set(question.fingerprint, seenQuestion);
    seenByFact.set(questionFactKey(question), seenQuestion);
    const optionSetKey = questionOptionSetKey(question);
    if (optionSetKey) seenByOptionSet.set(optionSetKey, seenQuestion);
    const templateKey = questionTemplateKey(question);
    if (templateKey) seenByTemplate.set(templateKey, seenQuestion);
  }
  const resolveSeenRecord = (question: Question) =>
    seenMap.get(question.id) ??
    seenByFingerprint.get(question.fingerprint) ??
    seenByFact.get(questionFactKey(question)) ??
    seenByOptionSet.get(questionOptionSetKey(question) ?? "") ??
    seenByTemplate.get(questionTemplateKey(question) ?? "");
  const seenRecords = new Map(
    bank.map((question) => [question.id, resolveSeenRecord(question)]),
  );
  const seenRecordFor = (question: Question) => seenRecords.get(question.id);
  const historicallySeenIds = new Set(
    bank
      .filter((question) => Boolean(seenRecordFor(question)))
      .map((question) => question.id),
  );
  const selectedCategoryIds = new Set(setup.categoryIds);
  const selectedOnlyCategory =
    selectedCategoryIds.size === 1 ? setup.categoryIds[0] : undefined;
  const countryLookupLimit =
    selectedOnlyCategory === "cat-1"
      ? Math.max(1, Math.floor(setup.questionCount / 15))
      : Number.POSITIVE_INFINITY;
  const matchesCategorySelection = (question: Question) => {
    if (question.status !== "active") return false;
    if (["cat-45", "cat-46", "cat-47"].includes(selectedOnlyCategory ?? ""))
      return matchesSelectedUmbrellaCategory(question, selectedCategoryIds);
    return (
      selectedCategoryIds.has(question.categoryId) ||
      (selectedCategoryIds.size === 1 &&
        question.secondaryCategoryIds.includes(selectedOnlyCategory ?? "")) ||
      matchesSelectedUmbrellaCategory(question, selectedCategoryIds)
    );
  };
  const eligibleBank = shuffle(bank, random).filter(matchesCategorySelection);
  const minimumDifficulty = Math.max(1, setup.difficulty - 1);
  const maximumDifficulty = Math.min(5, setup.difficulty + 1);
  const inDifficultyBand = (question: Question) =>
    question.difficulty >= minimumDifficulty &&
    question.difficulty <= maximumDifficulty;
  const inBandBank = eligibleBank.filter(inDifficultyBand);
  const candidatePool = [
    ...inBandBank,
    ...eligibleBank.filter((question) => !inDifficultyBand(question)),
  ];
  const picked: Question[] = [];
  const pickedIds = new Set<string>();
  const pickedFingerprints = new Set<string>();
  const pickedFacts = new Set<string>();
  const pickedOptionSets = new Set<string>();
  const pickedTopics = new Set<string>();
  const pickedOptionTexts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const templateCounts = new Map<string, number>();
  const templateLimit = 1;
  const categoryLimit = Math.max(
    2,
    Math.ceil(setup.questionCount / Math.max(1, selectedCategoryIds.size)),
  );
  const categoryBias = new Map(
    setup.categoryIds.map((categoryId) => [categoryId, random() * 14]),
  );
  // Et tilfældigt starttal pr. spørgsmål gør to friske enheder mærkbart
  // forskellige. Det bevarer alle kvalitets-, kategori- og historikregler,
  // men undgår at den samme marginalt højest vurderede pulje altid vinder.
  const randomPriority = new Map(
    candidatePool.map((question) => [question.id, random() * 40]),
  );
  const optionSetKeys = new Map(
    candidatePool.map((question) => [
      question.id,
      questionOptionSetKey(question),
    ]),
  );
  const optionTextKeys = new Map(
    candidatePool.map((question) => [
      question.id,
      question.options.map((option) => normalizeText(option.text)),
    ]),
  );
  const recentSeenOptionTexts = new Set(
    seen
      .filter((item) => {
        const seenAt = Date.parse(item.lastSeen);
        return (
          Number.isFinite(seenAt) && Date.now() - seenAt < REPEAT_COOLDOWN_MS
        );
      })
      .flatMap((item) => item.optionTexts ?? []),
  );
  const factKeys = new Map(
    candidatePool.map((question) => [question.id, questionFactKey(question)]),
  );
  const templateKeys = new Map(
    candidatePool.map((question) => [
      question.id,
      questionTemplateKey(question),
    ]),
  );
  const qualityScores = new Map(
    candidatePool.map((question) => [
      question.id,
      effectiveQualityScore(question),
    ]),
  );
  const recentHistoryOptionReuse = new Map(
    candidatePool.map((question) => [
      question.id,
      (optionTextKeys.get(question.id) ?? []).filter((option) =>
        recentSeenOptionTexts.has(option),
      ).length,
    ]),
  );
  const generalQuota = selectedCategoryIds.has("cat-1")
    ? Math.max(2, Math.round(setup.questionCount * 0.2))
    : 0;
  const generalSlots = new Set(
    Array.from({ length: generalQuota }, (_, slot) =>
      Math.min(
        setup.questionCount - 1,
        Math.floor(((slot + 0.5) * setup.questionCount) / generalQuota),
      ),
    ),
  );
  const selectedCategoryFor = (question: Question) => question.categoryId;
  const plannedDifficulties = difficultyPlan(
    setup.questionCount,
    setup.difficulty,
    setup.difficultyMode,
    random,
  );
  for (let i = 0; i < setup.questionCount; i++) {
    const target = plannedDifficulties[i];
    const recentTypes = picked.slice(-2).map((q) => q.type),
      recentCats = picked.slice(-2).map((q) => q.categoryId);
    let chosen: Question | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    const chooseFromPool = (
      allowRepeatedFact: boolean,
      allowRepeatedTemplate: boolean,
      requireGeneralKnowledge: boolean,
      allowRepeatedCategory: boolean,
      seenPolicy: "unseen" | "old" | "any",
      difficultyPolicy: "selected-band" | "fallback",
    ) => {
      for (const question of candidatePool) {
        const factKey = factKeys.get(question.id) ?? "";
        const templateKey = templateKeys.get(question.id);
        const optionSetKey = optionSetKeys.get(question.id);
        const normalizedOptionTexts = optionTextKeys.get(question.id) ?? [];
        const currentGameOptionReuse = normalizedOptionTexts.reduce(
          (sum, option) => sum + (pickedOptionTexts.get(option) ?? 0),
          0,
        );
        const historicalOptionReuse =
          recentHistoryOptionReuse.get(question.id) ?? 0;
        const seenQuestion = seenRecordFor(question);
        const seenAt = seenQuestion
          ? Date.parse(seenQuestion.lastSeen)
          : Number.NaN;
        const seenAge = Number.isFinite(seenAt)
          ? Math.max(0, Date.now() - seenAt)
          : 0;
        if (
          (seenPolicy === "unseen" && seenQuestion) ||
          (seenPolicy === "old" &&
            (!seenQuestion || seenAge < REPEAT_COOLDOWN_MS)) ||
          (seenPolicy === "any" && !seenQuestion) ||
          (difficultyPolicy === "selected-band" &&
            !inDifficultyBand(question)) ||
          (requireGeneralKnowledge && !isGeneralKnowledgeQuestion(question)) ||
          (!allowRepeatedCategory &&
            (categoryCounts.get(question.categoryId) ?? 0) >= categoryLimit) ||
          pickedIds.has(question.id) ||
          pickedFingerprints.has(question.fingerprint) ||
          (optionSetKey && pickedOptionSets.has(optionSetKey)) ||
          (!allowRepeatedFact && pickedFacts.has(factKey)) ||
          (!allowRepeatedFact &&
            pickedTopics.has(questionTopicKey(question) ?? "")) ||
          (templateKey === "country-lookup" &&
            (templateCounts.get(templateKey) ?? 0) >= countryLookupLimit) ||
          (!allowRepeatedTemplate &&
            templateKey &&
            (templateCounts.get(templateKey) ?? 0) >= templateLimit)
        )
          continue;
        const selectedCategory = selectedCategoryFor(question);
        const repeatedType =
          recentTypes.length === 2 &&
          recentTypes.every((type) => type === question.type);
        const repeatedCategory =
          recentCats.length === 2 &&
          recentCats.every((category) => category === question.categoryId);
        const score =
          (setup.favorites.includes(selectedCategory) ? -70 : 0) +
          (categoryBias.get(selectedCategory) ?? 7) +
          (randomPriority.get(question.id) ?? 20) +
          (templateKey === "country-lookup"
            ? 90
            : templateKey === "creator-attribution"
              ? 70
              : templateKey
                ? 50
                : 0) +
          (SPECIALIST_CATEGORY_IDS.has(selectedCategory) &&
          !setup.favorites.includes(selectedCategory)
            ? 8
            : 0) +
          (/^(wd|wikithin|wikiculture)-/.test(question.id) &&
          setup.difficulty <= 3
            ? 5
            : 0) +
          (seenQuestion
            ? seenQuestion.count * 20 -
              Math.min(365, seenAge / (24 * 60 * 60 * 1_000)) * 25
            : 0) +
          (inDifficultyBand(question) ? 0 : 1_000) +
          Math.abs(question.difficulty - target) * 120 +
          (categoryCounts.get(selectedCategory) ?? 0) * 45 +
          currentGameOptionReuse * 55 +
          historicalOptionReuse * 10 +
          (repeatedType ? 40 : 0) +
          (repeatedCategory ? 40 : 0) -
          (qualityScores.get(question.id) ?? 0) * 0.08;
        if (score < bestScore) {
          bestScore = score;
          chosen = question;
        }
      }
    };
    const requireGeneralKnowledge = generalSlots.has(i);
    const chooseWithSeenPolicy = (
      policy: "unseen" | "old" | "any",
      difficultyPolicy: "selected-band" | "fallback",
    ) => {
      chooseFromPool(
        false,
        false,
        requireGeneralKnowledge,
        false,
        policy,
        difficultyPolicy,
      );
      if (!chosen)
        chooseFromPool(
          true,
          false,
          requireGeneralKnowledge,
          false,
          policy,
          difficultyPolicy,
        );
      if (!chosen)
        chooseFromPool(
          true,
          true,
          requireGeneralKnowledge,
          false,
          policy,
          difficultyPolicy,
        );
      if (!chosen && requireGeneralKnowledge)
        chooseFromPool(false, false, false, false, policy, difficultyPolicy);
      if (!chosen)
        chooseFromPool(true, true, false, true, policy, difficultyPolicy);
    };
    // Gennemgå hele historikprioriteten inden for ±1 niveau, før banken
    // overhovedet må udvide. Et ældre niveau 3-spørgsmål er bedre end et
    // helt nyt niveau 1-spørgsmål, når spilleren har valgt niveau 4.
    chooseWithSeenPolicy("unseen", "selected-band");
    if (!chosen) chooseWithSeenPolicy("old", "selected-band");
    if (!chosen) chooseWithSeenPolicy("any", "selected-band");
    if (!chosen) chooseWithSeenPolicy("unseen", "fallback");
    if (!chosen) chooseWithSeenPolicy("old", "fallback");
    if (!chosen) chooseWithSeenPolicy("any", "fallback");
    // Usete kommer altid først. Derefter vælges de ældst sete spørgsmål,
    // så en gennemspillet kategori fortsat kan bruges uden gentagelser i spillet.
    if (!chosen) break;
    picked.push(chosen);
    pickedIds.add(chosen.id);
    pickedFingerprints.add(chosen.fingerprint);
    pickedFacts.add(questionFactKey(chosen));
    const topicKey = questionTopicKey(chosen);
    if (topicKey) pickedTopics.add(topicKey);
    const optionSetKey = questionOptionSetKey(chosen);
    if (optionSetKey) pickedOptionSets.add(optionSetKey);
    for (const key of optionTextKeys.get(chosen.id) ?? []) {
      pickedOptionTexts.set(key, (pickedOptionTexts.get(key) ?? 0) + 1);
    }
    const templateKey = questionTemplateKey(chosen);
    if (templateKey)
      templateCounts.set(
        templateKey,
        (templateCounts.get(templateKey) ?? 0) + 1,
      );
    const selectedCategory = selectedCategoryFor(chosen);
    categoryCounts.set(
      selectedCategory,
      (categoryCounts.get(selectedCategory) ?? 0) + 1,
    );
  }
  const fairTypesDistributed = balanceFairTurnTypes(
    picked,
    candidatePool,
    setup,
    historicallySeenIds,
  );
  const difficultyBalanced = balancePlayerDifficulties(
    fairTypesDistributed,
    Math.max(1, setup.players.length),
  );
  const distributed = spreadCategoriesAcrossTurns(
    difficultyBalanced,
    Math.max(1, setup.players.length),
  );
  // Sidste sikkerhedsnet: ingen senere balancering må nogensinde kunne føre et
  // spørgsmål fra en fravalgt emnekategori ind i spillet.
  const categorySafeQuestions = distributed.filter(matchesCategorySelection);
  const questionsWithSelectedCategory = categorySafeQuestions.map(
    (question) => {
      if (!selectedOnlyCategory || selectedCategoryIds.has(question.categoryId))
        return question;
      return {
        ...question,
        categoryId: selectedOnlyCategory,
        secondaryCategoryIds: [
          ...new Set([question.categoryId, ...question.secondaryCategoryIds]),
        ],
      };
    },
  );
  return questionsWithSelectedCategory.map((question, index) => {
    const shuffled = shuffleAnswers(question, random);
    const finaleQuestionCount = Math.max(1, setup.players.length);
    return setup.finale &&
      index >=
        Math.max(0, questionsWithSelectedCategory.length - finaleQuestionCount)
      ? {
          ...shuffled,
          finale: true,
        }
      : shuffled;
  });
}

export function selectReplacementQuestion(
  bank: Question[],
  currentGameQuestions: Question[],
  setup: GameSetup,
  seen: SeenQuestion[] = [],
  random = Math.random,
) {
  const blockedIds = new Set(
    currentGameQuestions.map((question) => question.id),
  );
  const blockedFingerprints = new Set(
    currentGameQuestions.map((question) => question.fingerprint),
  );
  const blockedFacts = new Set(
    currentGameQuestions.map((question) => questionFactKey(question)),
  );
  const available = bank.filter(
    (question) =>
      !blockedIds.has(question.id) &&
      !blockedFingerprints.has(question.fingerprint) &&
      !blockedFacts.has(questionFactKey(question)),
  );

  return selectQuestions(
    available,
    { ...setup, questionCount: 1 },
    seen,
    random,
  )[0];
}

export function reserveSeenQuestions(
  seen: SeenQuestion[],
  questionIds: string[],
  lastSeen = new Date().toISOString(),
  questions: Question[] = [],
) {
  const byId = new Map(seen.map((item) => [item.id, item]));
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  for (const id of new Set(questionIds)) {
    const previous = byId.get(id);
    const question = questionsById.get(id);
    byId.set(id, {
      id,
      lastSeen,
      count: (previous?.count ?? 0) + 1,
      correct: previous?.correct ?? false,
      fingerprint: question?.fingerprint ?? previous?.fingerprint,
      factKey: question ? questionFactKey(question) : previous?.factKey,
      optionSetKey: question
        ? questionOptionSetKey(question)
        : previous?.optionSetKey,
      optionTexts: question
        ? question.options.map((option) => normalizeText(option.text))
        : previous?.optionTexts,
      templateKey: question
        ? questionTemplateKey(question)
        : previous?.templateKey,
    });
  }
  return [...byId.values()];
}

export function recoverSeenFromHistory(
  seen: SeenQuestion[],
  results: Array<Pick<GameResult, "playedAt" | "questions">>,
) {
  const recovered = new Map(seen.map((item) => [item.id, item]));
  const historyById = new Map<
    string,
    { question: Question; lastSeen: string; count: number }
  >();
  for (const result of results) {
    for (const question of result.questions) {
      const previous = historyById.get(question.id);
      historyById.set(question.id, {
        question,
        lastSeen:
          !previous || result.playedAt > previous.lastSeen
            ? result.playedAt
            : previous.lastSeen,
        count: (previous?.count ?? 0) + 1,
      });
    }
  }
  for (const [id, history] of historyById) {
    const previous = recovered.get(id);
    if (previous) {
      recovered.set(id, {
        ...previous,
        fingerprint: previous.fingerprint ?? history.question.fingerprint,
        factKey: previous.factKey ?? questionFactKey(history.question),
        optionSetKey:
          previous.optionSetKey ?? questionOptionSetKey(history.question),
        optionTexts:
          previous.optionTexts ??
          history.question.options.map((option) => normalizeText(option.text)),
        templateKey:
          previous.templateKey ?? questionTemplateKey(history.question),
      });
      continue;
    }
    recovered.set(id, {
      id,
      lastSeen: history.lastSeen,
      count: history.count,
      correct: false,
      fingerprint: history.question.fingerprint,
      factKey: questionFactKey(history.question),
      optionSetKey: questionOptionSetKey(history.question),
      optionTexts: history.question.options.map((option) =>
        normalizeText(option.text),
      ),
      templateKey: questionTemplateKey(history.question),
    });
  }
  return [...recovered.values()];
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
