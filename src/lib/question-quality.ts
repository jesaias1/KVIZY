import type { Question } from "./types";

export type QualityIssueCode =
  | "generic_explanation"
  | "missing_source"
  | "option_pattern"
  | "answer_length_bias"
  | "time_sensitive_without_expiry"
  | "weak_quality_score";

export type QualityIssue = {
  code: QualityIssueCode;
  label: string;
  severity: "warning" | "error";
};

const GENERIC_EXPLANATIONS = [
  "det er den centrale sammenhæng, spørgsmålet tester",
  "det korrekte svar er",
  "svaret er",
];

export function hasUsefulExplanation(explanation?: string) {
  if (!explanation || explanation.trim().length < 24) return false;
  const normalized = explanation.toLocaleLowerCase("da");
  return !GENERIC_EXPLANATIONS.some((phrase) => normalized.includes(phrase));
}

export function hasPublicSource(
  question: Pick<Question, "sourceLabel" | "sourceUrl">,
) {
  return Boolean(
    question.sourceUrl ||
    (question.sourceLabel &&
      question.sourceLabel !== "KVIZY redaktionel seedbank"),
  );
}

const ANSWER_LEAK_STOP_WORDS = new Set([
  "album",
  "arena",
  "audio",
  "auto",
  "bilen",
  "bilmodel",
  "bryggeri",
  "cars",
  "city",
  "company",
  "corporation",
  "delay",
  "dollar",
  "familie",
  "familien",
  "film",
  "firma",
  "foundation",
  "kort",
  "midi",
  "motor",
  "peak",
  "rente",
  "renter",
  "serie",
  "serien",
  "software",
  "stadion",
  "stadium",
  "super",
  "technologies",
  "virksomhed",
  "virksomheden",
  "vitamin",
  "spørgsmål",
]);

function normalizeForAudit(value: string) {
  return value
    .toLocaleLowerCase("da")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasAnswerLeak(question: Question) {
  if (
    ["true_false", "what_came_first", "odd_one_out", "ordering"].includes(
      question.type,
    )
  )
    return false;
  const answer = question.options.find(
    (option) => option.id === question.correctOptionId,
  )?.text;
  if (!answer) return false;
  const normalizedPrompt = normalizeForAudit(question.prompt);
  const normalizedAnswer = normalizeForAudit(answer);
  if (normalizedAnswer.length >= 4 && normalizedPrompt.includes(normalizedAnswer))
    return true;
  const answerTokens = normalizedAnswer
    .split(" ")
    .filter(
      (token) => token.length >= 4 && !ANSWER_LEAK_STOP_WORDS.has(token),
    );
  if (answerTokens.length === 0) return false;
  const promptTokens = new Set(normalizedPrompt.split(" "));
  const overlap = answerTokens.filter((token) => promptTokens.has(token));
  if (overlap.length / answerTokens.length >= 0.5) return true;

  // Fang morfologiske giveaways som Platon/platonisme og bøg/bøgeskov.
  // Lange ordstammer begrænser falske positiver fra almindelige korte ord.
  const promptTokenList = [...promptTokens].filter((token) => token.length >= 5);
  return answerTokens.some((answerToken) =>
    promptTokenList.some((promptToken) => {
      const shortest = Math.min(answerToken.length, promptToken.length);
      return (
        shortest >= 5 &&
        (answerToken.startsWith(promptToken) ||
          promptToken.startsWith(answerToken))
      );
    }),
  );
}

export function auditQuestion(question: Question): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!hasUsefulExplanation(question.explanation))
    issues.push({
      code: "generic_explanation",
      label: "Faktafeltet tilfører ikke ny viden",
      severity: "warning",
    });
  if (!hasPublicSource(question))
    issues.push({
      code: "missing_source",
      label: "Mangler offentlig kilde",
      severity: "warning",
    });
  if (
    question.options.some((option) =>
      /alle ovenstående|ingen af ovenstående/i.test(option.text),
    )
  )
    issues.push({
      code: "option_pattern",
      label: "Indeholder en forbudt standardsvarmulighed",
      severity: "error",
    });
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  const otherLengths = question.options
    .filter((option) => option.id !== question.correctOptionId)
    .map((option) => option.text.length);
  if (
    correct &&
    otherLengths.length > 1 &&
    correct.text.length > Math.max(...otherLengths) * 1.8
  )
    issues.push({
      code: "answer_length_bias",
      label: "Det korrekte svar er markant længere end distraktorerne",
      severity: "warning",
    });
  if (
    question.timeSensitive &&
    (!question.validUntil || !hasPublicSource(question))
  )
    issues.push({
      code: "time_sensitive_without_expiry",
      label: "Tidsfølsomt spørgsmål mangler kilde eller udløbsdato",
      severity: "error",
    });
  if (question.qualityScore < 80)
    issues.push({
      code: "weak_quality_score",
      label: "Kvalitetsscoren er under 80",
      severity: "warning",
    });
  return issues;
}

export function effectiveQualityScore(question: Question) {
  const penalty = auditQuestion(question).reduce(
    (sum, issue) => sum + (issue.severity === "error" ? 25 : 8),
    0,
  );
  return Math.max(0, question.qualityScore - penalty);
}
