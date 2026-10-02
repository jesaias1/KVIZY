import { stableHash } from "@/lib/engine";
import type { Question, QuestionType } from "@/lib/types";

// Kompakt format til håndskrevne spørgsmål. Det rigtige svar står altid
// først; spillet blander svarmulighederne, når en runde sammensættes.

const createdAt = "2026-10-02T00:00:00.000Z";

export type Extra = {
  /** Emne, der bruges til at undgå flere spørgsmål om det samme i ét spil. */
  topic?: string;
  /** Ekstra kategorier, spørgsmålet også passer i. */
  also?: number[];
};

export type Spec = {
  type: QuestionType;
  cat: number;
  d: number;
  prompt: string;
  options: string[];
  explanation: string;
  /** Kun rækkefølge-spørgsmål: options står allerede i korrekt rækkefølge. */
  ordered?: boolean;
  /** Indeks for det rigtige svar, når det ikke står først. */
  correctIndex?: number;
  extra?: Extra;
};

const spec =
  (type: QuestionType) =>
  (
    cat: number,
    d: number,
    prompt: string,
    options: [string, string, string, string],
    explanation: string,
    extra?: Extra,
  ): Spec => ({ type, cat, d, prompt, options, explanation, extra });

/** Klassisk spørgsmål med fire svarmuligheder. */
export const mc = spec("multiple_choice");
/** Hvad kom først? Det ældste står først. */
export const first = spec("what_came_first");
/** Hvilken passer ikke ind? Den afvigende står først. */
export const odd = spec("odd_one_out");
/** Nærmest vinder: fire tal, det rigtige først. */
export const close = spec("closest_wins");
/** Hvem eller hvad beskrives? */
export const desc = spec("description");

/** Sandt eller falsk. */
export const tf = (
  cat: number,
  d: number,
  statement: string,
  answer: boolean,
  explanation: string,
  extra?: Extra,
): Spec => ({
  type: "true_false",
  cat,
  d,
  prompt: `Sandt eller falsk: ${statement}`,
  options: ["Sandt", "Falsk"],
  correctIndex: answer ? 0 : 1,
  explanation,
  extra,
});

/** Rækkefølge: angiv de fire led i korrekt rækkefølge. */
export const order = (
  cat: number,
  d: number,
  prompt: string,
  options: [string, string, string, string],
  explanation: string,
  extra?: Extra,
): Spec => ({
  type: "ordering",
  cat,
  d,
  prompt,
  options,
  explanation,
  ordered: true,
  extra,
});

// Rækkefølge-spørgsmål blandes ikke af spillet, så de vises i en fast,
// blandet opstilling, der varierer fra spørgsmål til spørgsmål.
const SCRAMBLES = [
  [2, 0, 3, 1],
  [1, 3, 0, 2],
  [3, 1, 2, 0],
  [2, 3, 1, 0],
];

export function buildCurated(specs: Spec[]): Question[] {
  return specs.map((item) => {
    const hash = stableHash(`${item.type}:${item.prompt}`);
    const ids = item.options.map((_, index) => `o${index + 1}`);
    const scramble = item.ordered
      ? SCRAMBLES[hash.charCodeAt(0) % SCRAMBLES.length]
      : ids.map((_, index) => index);
    const options = scramble.map((position) => ({
      id: ids[position],
      text: item.options[position],
    }));
    return {
      id: `kz-${hash}`,
      prompt: item.prompt,
      type: item.type,
      categoryId: `cat-${item.cat}`,
      secondaryCategoryIds: (item.extra?.also ?? []).map((n) => `cat-${n}`),
      difficulty: item.d,
      options,
      correctOptionId: item.ordered ? undefined : ids[item.correctIndex ?? 0],
      correctOrder: item.ordered ? ids : undefined,
      explanation: item.explanation,
      sourceLabel: "KVIZY-redaktionen, gennemgået 2026",
      tags: [item.extra?.topic ?? "kurateret", item.type, "kurateret-2026"],
      origin: "curated",
      status: "active",
      fingerprint: stableHash(
        `kz:${item.type}:${item.prompt}:${item.options[item.correctIndex ?? 0]}`,
      ),
      qualityScore: 97,
      timeSensitive: false,
      createdAt,
      updatedAt: createdAt,
      playCount: 0,
      correctRate: 0,
      reportCount: 0,
    } satisfies Question;
  });
}
