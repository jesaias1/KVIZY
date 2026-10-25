import { z } from "zod";
import { fingerprint, shuffleAnswers, stableHash } from "./engine";
import type { Question } from "./types";

// Spillernes egne quizzer. Hele quizzen ligger i selve linket (efter #), så
// ingen server ser den, og der skal hverken logges ind eller gemmes noget.

export const CUSTOM_MAX_QUESTIONS = 30;
export const CUSTOM_TITLE_MAX = 40;
export const CUSTOM_PROMPT_MAX = 200;
export const CUSTOM_OPTION_MAX = 80;
export const CUSTOM_EXPLANATION_MAX = 300;
/** Længere links end dette driller i flere beskedtjenester. */
export const CUSTOM_LINK_SOFT_LIMIT = 6_000;

const text = (max: number) => z.string().trim().min(1).max(max);

export const customQuizSchema = z.object({
  v: z.literal(1),
  title: z.string().trim().max(CUSTOM_TITLE_MAX),
  items: z
    .array(
      z.object({
        q: z.string().trim().min(8).max(CUSTOM_PROMPT_MAX),
        a: text(CUSTOM_OPTION_MAX),
        w: z.array(text(CUSTOM_OPTION_MAX)).min(1).max(3),
        e: z.string().trim().max(CUSTOM_EXPLANATION_MAX).optional(),
      }),
    )
    .min(1)
    .max(CUSTOM_MAX_QUESTIONS),
});
export type CustomQuiz = z.infer<typeof customQuizSchema>;
export type CustomItem = CustomQuiz["items"][number];

const normalize = (value: string) => value.trim().toLocaleLowerCase();

/** Hvad der mangler, før en opgave kan bruges. Tom liste = klar. */
export function customItemProblems(item: {
  q: string;
  a: string;
  w: string[];
}): ("prompt" | "answer" | "wrong" | "duplicate")[] {
  const problems: ("prompt" | "answer" | "wrong" | "duplicate")[] = [];
  if (item.q.trim().length < 8) problems.push("prompt");
  if (!item.a.trim()) problems.push("answer");
  const wrong = item.w.map((w) => w.trim()).filter(Boolean);
  if (wrong.length === 0) problems.push("wrong");
  const all = [item.a, ...wrong].map(normalize).filter(Boolean);
  if (new Set(all).size !== all.length) problems.push("duplicate");
  return problems;
}

/** Fjerner tomme svarfelter og afviser alt, der ikke kan spilles. */
export function cleanCustomQuiz(raw: unknown): CustomQuiz | null {
  if (!raw || typeof raw !== "object") return null;
  const draft = raw as { title?: unknown; items?: unknown };
  const items = Array.isArray(draft.items)
    ? draft.items
        .filter((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object"),
        )
        .map((item) => ({
          q: typeof item.q === "string" ? item.q : "",
          a: typeof item.a === "string" ? item.a : "",
          w: (Array.isArray(item.w) ? item.w : [])
            .filter((w): w is string => typeof w === "string")
            .map((w) => w.trim())
            .filter(Boolean),
          e: typeof item.e === "string" && item.e.trim() ? item.e : undefined,
        }))
    : [];
  const parsed = customQuizSchema.safeParse({
    v: 1,
    title: typeof draft.title === "string" ? draft.title : "",
    items,
  });
  if (!parsed.success) return null;
  // Samme svar to gange gør spørgsmålet umuligt at svare entydigt på.
  const valid = parsed.data.items.every(
    (item) => customItemProblems(item).length === 0,
  );
  return valid ? parsed.data : null;
}

// ── Link ────────────────────────────────────────────────────

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};
const fromBase64Url = (value: string) => {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: TransformStream) {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

const hasCompression = () =>
  typeof CompressionStream !== "undefined" &&
  typeof DecompressionStream !== "undefined";

/** Quizzen som tekst til en adresse: "z" foran = komprimeret, "p" = ukomprimeret. */
export async function encodeCustomQuiz(quiz: CustomQuiz): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(quiz));
  if (hasCompression())
    return `z${toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")))}`;
  return `p${toBase64Url(bytes)}`;
}

export async function decodeCustomQuiz(
  encoded: string,
): Promise<CustomQuiz | null> {
  try {
    if (encoded.length < 2 || encoded.length > 40_000) return null;
    const kind = encoded[0];
    const bytes = fromBase64Url(encoded.slice(1));
    let json: string;
    if (kind === "z") {
      if (!hasCompression()) return null;
      json = new TextDecoder().decode(
        await pipe(bytes, new DecompressionStream("deflate-raw")),
      );
    } else if (kind === "p") json = new TextDecoder().decode(bytes);
    else return null;
    if (json.length > 120_000) return null;
    return cleanCustomQuiz(JSON.parse(json));
  } catch {
    return null;
  }
}

export const CUSTOM_HASH_KEY = "quiz";

export const customQuizLink = (origin: string, encoded: string) =>
  `${origin}/#${CUSTOM_HASH_KEY}=${encoded}`;

/** Henter koden ud af en adresses hash, hvis den er en quiz. */
export function customQuizFromHash(hash: string): string | null {
  const match = hash.match(
    new RegExp(`^#${CUSTOM_HASH_KEY}=([A-Za-z0-9_-]+)$`),
  );
  return match ? match[1] : null;
}

// ── Til spillet ─────────────────────────────────────────────

/** Gør en egen quiz til almindelige spørgsmål, så spillet kan køre dem uændret. */
export function customQuizQuestions(
  quiz: CustomQuiz,
  random = Math.random,
): Question[] {
  const now = new Date().toISOString();
  const seed = stableHash(JSON.stringify(quiz));
  return quiz.items.map((item, index) => {
    const options = [item.a, ...item.w].map((optionText, optionIndex) => ({
      id: `o${optionIndex + 1}`,
      text: optionText,
    }));
    const explanation = item.e?.trim()
      ? item.e.trim()
      : `Det rigtige svar er ${item.a}.`;
    return shuffleAnswers(
      {
        id: `custom-${seed}-${index}`,
        prompt: item.q,
        type: "multiple_choice",
        categoryId: "cat-1",
        secondaryCategoryIds: [],
        difficulty: 3,
        options,
        correctOptionId: "o1",
        explanation: explanation.length >= 8 ? explanation : `${explanation}.`,
        tags: ["custom"],
        origin: "curated",
        status: "active",
        fingerprint: fingerprint(item.q, item.a, "multiple_choice"),
        qualityScore: 50,
        timeSensitive: false,
        createdAt: now,
        updatedAt: now,
        playCount: 0,
        correctRate: 0,
        reportCount: 0,
      },
      random,
    );
  });
}
