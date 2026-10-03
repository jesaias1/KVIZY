import { z } from "zod";

export const questionTypes = [
  "multiple_choice",
  "true_false",
  "odd_one_out",
  "what_came_first",
  "quote",
  "incorrect_statement",
  "correct_statement",
  "description",
  "closest_wins",
  "ordering",
  "precise",
  "image",
  "category_cross",
  "finale",
] as const;
export type QuestionType = (typeof questionTypes)[number];

export const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(120),
});
export const questionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(8).max(300),
    type: z.enum(questionTypes),
    categoryId: z.string().min(1),
    secondaryCategoryIds: z.array(z.string()),
    difficulty: z.number().int().min(1).max(5),
    options: z.array(optionSchema).min(2).max(4),
    correctOptionId: z.string().optional(),
    correctOrder: z.array(z.string()).optional(),
    explanation: z.string().min(8).max(500),
    sourceLabel: z.string().optional(),
    sourceUrl: z.url().optional(),
    tags: z.array(z.string()),
    origin: z.enum(["curated", "ai"]),
    status: z.enum(["draft", "active", "disabled", "reported"]),
    fingerprint: z.string(),
    qualityScore: z.number().min(0).max(100),
    timeSensitive: z.boolean(),
    validUntil: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    finale: z.boolean().optional(),
    modelId: z.string().optional(),
    promptVersion: z.string().optional(),
    validationStatus: z.string().optional(),
    playCount: z.number().int().nonnegative().default(0),
    correctRate: z.number().min(0).max(1).default(0),
    reportCount: z.number().int().nonnegative().default(0),
  })
  .superRefine((q, ctx) => {
    if (q.type !== "ordering" && !q.correctOptionId)
      ctx.addIssue({ code: "custom", message: "Korrekt svar mangler" });
    if (q.correctOptionId && !q.options.some((o) => o.id === q.correctOptionId))
      ctx.addIssue({
        code: "custom",
        message: "Korrekt svar findes ikke blandt mulighederne",
      });
    if (
      new Set(q.options.map((o) => o.text.trim().toLocaleLowerCase("da")))
        .size !== q.options.length
    )
      ctx.addIssue({ code: "custom", message: "Dublerede svarmuligheder" });
  });
export type Question = z.infer<typeof questionSchema>;

export type Category = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  niche?: boolean;
};
export type GameMode =
  "classic" | "teams" | "solo" | "quick" | "risk" | "mystery" | "blitz";
export type DifficultyMode = "fixed" | "mixed" | "rising";
export type GamePlayer = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  correct: number;
  answers: number;
  streak: number;
  longestStreak: number;
};
export type PlayerAnswer = {
  questionId: string;
  playerId: string;
  optionId: string;
  correct: boolean;
  points: number;
  responseMs: number;
  categoryId: string;
};
export type GameSetup = {
  mode: GameMode;
  players: GamePlayer[];
  questionCount: number;
  difficulty: number;
  difficultyMode: DifficultyMode;
  categoryIds: string[];
  favorites: string[];
  timer: boolean;
  timeBonus: boolean;
  streakBonus: boolean;
  minusPoints: boolean;
  finale: boolean;
  lifelines: boolean;
};
export type Game = {
  id: string;
  setup: GameSetup;
  questions: Question[];
  index: number;
  activePlayerIndex: number;
  answers: PlayerAnswer[];
  startedAt: string;
  completedAt?: string;
  riskMultiplier: number;
  lifelinesRemaining?: Record<string, number>;
  hiddenOptionIds?: string[];
  /** Datonøgle (åååå-mm-dd), hvis spillet er dagens quiz. */
  dailyKey?: string;
  /** Øvelsesrunde med tidligere fejl: tæller ikke som rekord. */
  practice?: boolean;
};
export type GameResult = {
  id: string;
  playedAt: string;
  setup: GameSetup;
  players: GamePlayer[];
  answers: PlayerAnswer[];
  questions: Question[];
};
export type SeenQuestion = {
  id: string;
  lastSeen: string;
  count: number;
  correct: boolean;
  fingerprint?: string;
  factKey?: string;
  optionSetKey?: string;
  optionTexts?: string[];
  templateKey?: string;
};
export const questionReportReasons = [
  "wrong_answer",
  "unclear",
  "difficulty",
  "bad_options",
  "outdated",
] as const;
export type QuestionReportReason = (typeof questionReportReasons)[number];
export type LocalQuestionReport = {
  id: string;
  questionId: string;
  reason: QuestionReportReason;
  note?: string;
  createdAt: string;
  synced: boolean;
  prompt?: string;
  options?: Question["options"];
  correctOptionId?: string;
  explanation?: string;
};
export type AppSettings = {
  theme: "dark" | "light";
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText?: boolean;
  confirmAnswers?: boolean;
  readAloud?: boolean;
};
