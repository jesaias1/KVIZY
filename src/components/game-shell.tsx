"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  CircleHelp,
  Clock3,
  CloudDownload,
  CloudUpload,
  Copy,
  Download,
  Flag,
  Flame,
  Gamepad2,
  Heart,
  History,
  KeyRound,
  LifeBuoy,
  Menu,
  RefreshCw,
  Search,
  Share2,
  Smartphone,
  Settings,
  Shuffle,
  Volume2 as Sound2,
  VolumeX as SoundOff,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand-lockup";
import { QuizOptionText, QuizText } from "@/components/quiz-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ANIMAL_AVATARS, APP_CONFIG, DIFFICULTY_LABELS } from "@/lib/config";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  DANISH_CATEGORY_IDS,
  DEFAULT_CATEGORIES,
  categoryById,
} from "@/lib/categories";
import {
  activeDailyStreak,
  answerIsCorrect,
  buildResult,
  calculateQuestionPoints,
  closestFairQuestionCount,
  dailySeed,
  emptyDailyProgress,
  fairQuestionCounts,
  localDateKey,
  mulberry32,
  newPlayer,
  normalizeText,
  questionTemplateKey,
  rankPlayers,
  recordDaily,
  recoverSeenFromHistory,
  reserveSeenQuestions,
  selectReplacementQuestion,
  selectQuestions,
  shuffle,
  type DailyProgress,
} from "@/lib/engine";
import type {
  AppSettings,
  Game,
  GameMode,
  GameResult,
  GameSetup,
  LocalQuestionReport,
  Question,
  QuestionReportReason,
  SeenQuestion,
} from "@/lib/types";
import {
  hasUsefulExplanation,
  questionOptionSetKey,
} from "@/lib/question-quality";
import { playCue } from "@/lib/sound";
import { computeStats, weakestCategories, type Stats } from "@/lib/stats";

type View =
  | "home"
  | "setup"
  | "play"
  | "results"
  | "history"
  | "stats"
  | "help"
  | "settings"
  | "review";
type BestScore = { correct: number; total: number; score: number; at: string };
type RecordInfo = { previous?: BestScore; isRecord: boolean } | null;
const defaults: AppSettings = {
  theme: "dark",
  sound: true,
  haptics: true,
  reducedMotion: false,
  highContrast: false,
};
const modes: { id: GameMode; title: string; text: string; icon: string }[] = [
  {
    id: "classic",
    title: "Alle mod alle",
    text: "Skift mellem spillerne",
    icon: "👥",
  },
  {
    id: "teams",
    title: "Hold mod hold",
    text: "2–6 hold på én enhed",
    icon: "🛡️",
  },
  { id: "solo", title: "Solo", text: "Slå din egen rekord", icon: "🎯" },
  {
    id: "quick",
    title: "Hurtig quiz",
    text: "Omkring 10 blandede spørgsmål",
    icon: "⚡",
  },
  { id: "risk", title: "Risiko", text: "Sats 1×, 2× eller 3×", icon: "🎲" },
  {
    id: "mystery",
    title: "Mystery Mix",
    text: "Overraskelser hele vejen",
    icon: "🎁",
  },
];
const typeLabels: Partial<Record<Question["type"], string>> = {
  true_false: "Sandt eller falsk",
  odd_one_out: "Hvilken passer ikke ind?",
  what_came_first: "Hvad kom først?",
  quote: "Hvem sagde det?",
  incorrect_statement: "Find det forkerte udsagn",
  correct_statement: "Find det korrekte udsagn",
  description: "Hvem eller hvad?",
  closest_wins: "Nærmest vinder",
  ordering: "Korrekt rækkefølge",
  category_cross: "Kategorikryds",
};
const LEVEL_HINTS: Record<number, string> = {
  1: "Spørgsmål, de fleste kan svare på uden at tænke sig om.",
  2: "Almen viden, som du sikkert har hørt før.",
  3: "Du kender emnet, men skal tænke dig om.",
  4: "Her skal du faktisk vide noget – eller kunne regne det ud.",
  5: "Til de rigtige quiznørder. Gæt er tilladt.",
};
const difficultyModes = [
  {
    id: "fixed",
    label: "Fast",
  },
  {
    id: "mixed",
    label: "Blandet",
  },
  {
    id: "rising",
    label: "Stigende",
  },
] as const;
const emptySetup = (): GameSetup => ({
  mode: "classic",
  players: [newPlayer("Spiller 1", 0), newPlayer("Spiller 2", 1)],
  questionCount: 10,
  difficulty: 3,
  difficultyMode: "mixed",
  categoryIds: DEFAULT_CATEGORIES.map((c) => c.id),
  favorites: [],
  timer: false,
  timeBonus: false,
  streakBonus: false,
  minusPoints: false,
  finale: false,
  lifelines: false,
});

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Spillet fortsætter, selv hvis browserens lokale lager er utilgængeligt.
  }
}
function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Manglende lageradgang må aldrig afbryde et spil.
  }
}
function trackEvent(
  event: "game_started" | "game_completed" | "question_reported",
  categoryIds: string[] = [],
) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, categoryIds }),
    keepalive: true,
  }).catch(() => undefined);
}
// Konfetti uden web worker: sidens indholdspolitik tillader ikke blob-workers.
let confettiCannon: ReturnType<typeof confetti.create> | null = null;
function fireConfetti(options: Parameters<typeof confetti>[0]) {
  if (!confettiCannon) {
    // Eget lærred, så det kan skjules for skærmlæsere og ikke fanger tryk.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "100",
    });
    document.body.appendChild(canvas);
    confettiCannon = confetti.create(canvas, {
      resize: true,
      useWorker: false,
    });
  }
  void confettiCannon(options);
}
function formatNames(names: string[]) {
  if (names.length < 2) return names[0] ?? "Ingen";
  return `${names.slice(0, -1).join(", ")} og ${names.at(-1)}`;
}
function restoreSetup(saved: Partial<GameSetup> | null): GameSetup {
  const fallback = emptySetup();
  if (
    !saved ||
    !Array.isArray(saved.players) ||
    saved.players.length === 0 ||
    !Array.isArray(saved.categoryIds)
  )
    return fallback;
  const validCategoryIds = new Set(CATEGORIES.map((category) => category.id));
  const validSavedCategoryIds = saved.categoryIds.filter((id) =>
    validCategoryIds.has(id),
  );
  const looksLikeOldDefaultSelection =
    validSavedCategoryIds.includes("cat-13") &&
    validSavedCategoryIds.length >= DEFAULT_CATEGORIES.length;
  const restoredPlayers = saved.players.slice(0, 12).map((player, index) => ({
    ...newPlayer(
      typeof player.name === "string" ? player.name : `Spiller ${index + 1}`,
      index,
    ),
    ...player,
    score: 0,
    correct: 0,
    answers: 0,
    streak: 0,
    longestStreak: 0,
  }));
  return {
    ...fallback,
    ...saved,
    mode: "classic",
    players:
      restoredPlayers.length < 2
        ? [...restoredPlayers, newPlayer("Spiller 2", 1)]
        : restoredPlayers,
    categoryIds: looksLikeOldDefaultSelection
      ? validSavedCategoryIds.filter((id) => id !== "cat-13")
      : validSavedCategoryIds,
    favorites: Array.isArray(saved.favorites)
      ? saved.favorites.filter((id) => validCategoryIds.has(id))
      : [],
    timeBonus: saved.timeBonus ?? false,
    streakBonus: saved.streakBonus ?? false,
    lifelines: saved.lifelines ?? false,
  };
}
const tone = playCue;
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function GameShell() {
  const [view, setView] = useState<View>("home"),
    [setup, setSetup] = useState<GameSetup>(emptySetup),
    [step, setStep] = useState(0),
    [game, setGame] = useState<Game | null>(null),
    [history, setHistory] = useState<GameResult[]>([]),
    [questionBank, setQuestionBank] = useState<Question[]>([]),
    [questionBankSignature, setQuestionBankSignature] = useState(""),
    [questionBankLoading, setQuestionBankLoading] = useState(false),
    [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
      null,
    ),
    [installContext, setInstallContext] = useState({
      mobile: false,
      ios: false,
      standalone: false,
    }),
    [settings, setSettings] = useState(defaults),
    [startError, setStartError] = useState<string | null>(null),
    [record, setRecord] = useState<RecordInfo>(null),
    [bests, setBests] = useState<Record<string, BestScore>>({}),
    [daily, setDaily] = useState<DailyProgress | null>(null),
    [todayKey, setTodayKey] = useState(""),
    [hydrated, setHydrated] = useState(false);
  const startBusy = useRef(false);
  const { setTheme } = useTheme();
  useEffect(() => {
    const id = window.setTimeout(() => {
      const storedGame = load<Game | null>(APP_CONFIG.gameKey, null);
      const storedHistory = load<GameResult[]>(APP_CONFIG.historyKey, []);
      const recoveredSeen = recoverSeenFromHistory(
        load<SeenQuestion[]>(APP_CONFIG.seenKey, []),
        storedHistory,
      );
      safeSet(APP_CONFIG.seenKey, JSON.stringify(recoveredSeen));
      const cachedBank = load<{
        version?: string;
        signature: string;
        questions: Question[];
      } | null>(APP_CONFIG.questionCacheKey, null);
      if (
        cachedBank?.version === APP_CONFIG.questionBankVersion &&
        cachedBank.questions?.length
      ) {
        setQuestionBank(cachedBank.questions);
        setQuestionBankSignature(cachedBank.signature);
      }
      setGame(storedGame);
      setHistory(storedHistory);
      setBests(load<Record<string, BestScore>>(APP_CONFIG.bestKey, {}));
      setDaily(load<DailyProgress>(APP_CONFIG.dailyKey, emptyDailyProgress()));
      setTodayKey(localDateKey());
      setSetup(
        restoreSetup(
          load<Partial<GameSetup> | null>(APP_CONFIG.setupKey, null),
        ),
      );
      const s = load(APP_CONFIG.settingsKey, defaults);
      setSettings(s);
      setTheme(s.theme);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [setTheme]);
  const loadQuestionBank = useCallback(
    async (categoryIds: string[]) => {
      const signature = [...new Set(categoryIds)].sort().join(",");
      if (signature === questionBankSignature && questionBank.length > 0)
        return questionBank;
      setQuestionBankLoading(true);
      try {
        const response = await fetch(
          `/api/question-bank?categories=${encodeURIComponent(signature)}&v=${APP_CONFIG.questionBankVersion}`,
          { cache: "no-store" },
        );
        const data = response.ok ? await response.json() : null;
        if (!Array.isArray(data?.questions) || data.questions.length === 0)
          throw new Error("Tom spørgsmålsbank");
        const loaded = data.questions as Question[];
        setQuestionBank(loaded);
        setQuestionBankSignature(signature);
        safeSet(
          APP_CONFIG.questionCacheKey,
          JSON.stringify({
            version: APP_CONFIG.questionBankVersion,
            signature,
            questions: loaded,
          }),
        );
        return loaded;
      } catch {
        const cached = load<{
          version?: string;
          signature: string;
          questions: Question[];
        } | null>(APP_CONFIG.questionCacheKey, null);
        return cached?.version === APP_CONFIG.questionBankVersion
          ? cached.questions
          : questionBank;
      } finally {
        setQuestionBankLoading(false);
      }
    },
    [questionBank, questionBankSignature],
  );
  useEffect(() => {
    const detect = window.setTimeout(() => {
      const navigatorWithStandalone = navigator as Navigator & {
        standalone?: boolean;
      };
      setInstallContext({
        mobile:
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          window.matchMedia("(max-width: 767px)").matches,
        ios: /iPhone|iPad|iPod/i.test(navigator.userAgent),
        standalone:
          window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(navigatorWithStandalone.standalone),
      });
    }, 0);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () =>
      setInstallContext((current) => ({ ...current, standalone: true }));
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.clearTimeout(detect);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    safeSet(APP_CONFIG.settingsKey, JSON.stringify(settings));
    setTheme(settings.theme);
    document.documentElement.classList.toggle(
      "contrast",
      settings.highContrast,
    );
    document.documentElement.classList.toggle(
      "reduce-motion",
      settings.reducedMotion,
    );
  }, [settings, hydrated, setTheme]);
  useEffect(() => {
    if (!hydrated) return;
    safeSet(APP_CONFIG.setupKey, JSON.stringify(setup));
  }, [setup, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    const pending = load<LocalQuestionReport[]>(APP_CONFIG.reportsKey, [])
      .filter((report) => !report.synced)
      .slice(0, 8);
    if (pending.length === 0) return;
    const controller = new AbortController();
    void (async () => {
      const syncedIds = new Set<string>();
      for (const report of pending) {
        try {
          const response = await fetch("/api/reports", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              questionId: report.questionId,
              reason: report.reason,
              note: report.note,
            }),
            signal: controller.signal,
          });
          const result = response.ok ? await response.json() : null;
          if (result?.stored) syncedIds.add(report.id);
        } catch {
          break;
        }
      }
      if (syncedIds.size === 0) return;
      const reports = load<LocalQuestionReport[]>(
        APP_CONFIG.reportsKey,
        [],
      ).map((report) =>
        syncedIds.has(report.id) ? { ...report, synced: true } : report,
      );
      safeSet(APP_CONFIG.reportsKey, JSON.stringify(reports));
    })();
    return () => controller.abort();
  }, [hydrated]);
  const go = (v: View) => {
    tone("tap", settings.sound);
    if (v === "setup") {
      setSetup((current) => ({
        ...current,
        mode: "classic",
        players:
          current.players.length < 2
            ? [...current.players, newPlayer("Spiller 2", 1)]
            : current.players,
      }));
    }
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const start = async (same?: GameSetup, options?: { daily?: string }) => {
    if (startBusy.current) return;
    startBusy.current = true;
    try {
      setStartError(null);
      const s = same ?? setup;
      const availableQuestions = await loadQuestionBank(s.categoryIds);
      if (availableQuestions.length === 0) {
        setStartError(
          "Spørgsmålene kunne ikke hentes. Tjek forbindelsen, eller prøv den senest gemte kategoriopsætning.",
        );
        setView("setup");
        return;
      }
      const selectedPlayers = s.mode === "solo" ? [s.players[0]] : s.players;
      const requestedCount = s.mode === "quick" ? 10 : s.questionCount;
      const normalized = {
        ...s,
        questionCount: closestFairQuestionCount(
          requestedCount,
          selectedPlayers.length,
        ),
        players: selectedPlayers,
      };
      const seenHistory = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
      // Dagens quiz er ens for alle: fast seed og ingen personlig historik.
      const questions = options?.daily
        ? selectQuestions(
            availableQuestions,
            normalized,
            [],
            mulberry32(dailySeed(options.daily)),
          )
        : selectQuestions(availableQuestions, normalized, seenHistory);
      if (questions.length < normalized.questionCount) {
        setStartError(
          questions.length === 0
            ? "Der er ingen spørgsmål i de valgte kategorier. Vælg flere kategorier."
            : `Der er kun ${questions.length} forskellige spørgsmål til denne opsætning. Vælg flere kategorier eller et kortere spil.`,
        );
        setView("setup");
        return;
      }
      const g: Game = {
        id: crypto.randomUUID(),
        setup: {
          ...normalized,
          players: normalized.players.map((p) => ({
            ...p,
            score: 0,
            correct: 0,
            answers: 0,
            streak: 0,
            longestStreak: 0,
          })),
        },
        questions,
        index: 0,
        activePlayerIndex: 0,
        answers: [],
        startedAt: new Date().toISOString(),
        riskMultiplier: 1,
        lifelinesRemaining: Object.fromEntries(
          normalized.players.map((player) => [player.id, 3]),
        ),
        hiddenOptionIds: [],
        dailyKey: options?.daily,
      };
      setGame(g);
      setRecord(null);
      safeSet(APP_CONFIG.gameKey, JSON.stringify(g));
      safeSet(
        APP_CONFIG.seenKey,
        JSON.stringify(
          reserveSeenQuestions(
            seenHistory,
            questions.map((question) => question.id),
            g.startedAt,
            questions,
          ),
        ),
      );
      trackEvent("game_started", normalized.categoryIds);
      go("play");
    } catch {
      setStartError(
        "Spillet kunne ikke startes. Opsætningen er bevaret – prøv igen.",
      );
      setView("setup");
    } finally {
      startBusy.current = false;
    }
  };
  const finish = (g: Game) => {
    const r = buildResult({ ...g, completedAt: new Date().toISOString() });
    const next = [r, ...history].slice(0, 30);
    setHistory(next);
    safeSet(APP_CONFIG.historyKey, JSON.stringify(next));
    safeRemove(APP_CONFIG.gameKey);
    trackEvent("game_completed", g.setup.categoryIds);
    setGame({ ...g, completedAt: r.playedAt });
    const leader = rankPlayers(g.setup.players)[0].player;
    const rate = leader.correct / Math.max(1, leader.answers);
    const soloRound = g.setup.players.length === 1;
    let isRecord = false;
    if (g.dailyKey) {
      const updated = recordDaily(daily ?? emptyDailyProgress(), g.dailyKey, {
        correct: leader.correct,
        total: g.questions.length,
        score: leader.score,
      });
      setDaily(updated);
      safeSet(APP_CONFIG.dailyKey, JSON.stringify(updated));
      setRecord(null);
    } else if (soloRound) {
      const key = `solo-${g.questions.length}`;
      const previous = bests[key];
      const better =
        !previous ||
        leader.correct > previous.correct ||
        (leader.correct === previous.correct && leader.score > previous.score);
      isRecord = Boolean(previous) && better;
      if (better) {
        const updated = {
          ...bests,
          [key]: {
            correct: leader.correct,
            total: g.questions.length,
            score: leader.score,
            at: r.playedAt,
          },
        };
        setBests(updated);
        safeSet(APP_CONFIG.bestKey, JSON.stringify(updated));
      }
      setRecord({ previous, isRecord });
    } else setRecord(null);
    // En svag solorunde skal ikke fejres med konfetti.
    const celebrate = !soloRound || rate >= 0.6 || isRecord;
    tone(celebrate ? "win" : "done", settings.sound);
    if (celebrate && !settings.reducedMotion)
      fireConfetti({
        particleCount: isRecord || rate >= 0.9 ? 160 : 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#ff6b35", "#35c2a6", "#e6b84b", "#fff"],
        disableForReducedMotion: true,
      });
    setView("results");
    window.scrollTo({ top: 0 });
  };
  const playDaily = () => {
    const key = localDateKey();
    if (daily?.results[key]) return;
    void start(
      {
        ...setup,
        mode: "solo",
        players: [setup.players[0] ?? newPlayer("Spiller 1", 0)],
        questionCount: 10,
        difficulty: 3,
        difficultyMode: "rising",
        categoryIds: DEFAULT_CATEGORIES.map((category) => category.id),
        favorites: [],
        timer: false,
        timeBonus: false,
        streakBonus: false,
        minusPoints: false,
        finale: false,
        lifelines: false,
      },
      { daily: key },
    );
  };
  const playLevel = (level: number) => {
    if (!game) return;
    setSetup((current) => ({ ...current, difficulty: level }));
    void start({ ...game.setup, difficulty: level });
  };
  const quick = (categoryIds?: string[]) => {
    // Ét tryk fra forsiden: ti blandede spørgsmål med de senest valgte
    // kategorier og det senest valgte niveau.
    void start({
      ...setup,
      mode: "quick",
      players: [setup.players[0] ?? newPlayer("Spiller 1", 0)],
      questionCount: 10,
      categoryIds:
        categoryIds && categoryIds.length
          ? categoryIds
          : setup.categoryIds.length
            ? setup.categoryIds
            : DEFAULT_CATEGORIES.map((category) => category.id),
      timer: false,
      timeBonus: false,
      minusPoints: false,
      finale: false,
      lifelines: false,
    });
  };
  const answer = (optionId: string, responseMs: number) => {
    if (
      !game ||
      game.answers.some((a) => a.questionId === game.questions[game.index].id)
    )
      return;
    const q = game.questions[game.index],
      p = game.setup.players[game.activePlayerIndex],
      correct = answerIsCorrect(q, optionId),
      points = calculateQuestionPoints(
        q,
        optionId,
        responseMs,
        game.setup.timeBonus ?? false,
        game.riskMultiplier,
        game.setup.minusPoints,
        p.streak,
        game.setup.streakBonus ?? false,
      );
    const players = game.setup.players.map((x) =>
      x.id === p.id
        ? {
            ...x,
            score: x.score + points,
            correct: x.correct + (correct ? 1 : 0),
            answers: x.answers + 1,
            streak: correct ? x.streak + 1 : 0,
            longestStreak: Math.max(
              x.longestStreak,
              correct ? x.streak + 1 : 0,
            ),
          }
        : x,
    );
    const next = {
      ...game,
      setup: { ...game.setup, players },
      answers: [
        ...game.answers,
        {
          questionId: q.id,
          playerId: p.id,
          optionId,
          correct,
          points,
          responseMs,
          categoryId: q.categoryId,
        },
      ],
    };
    setGame(next);
    safeSet(APP_CONFIG.gameKey, JSON.stringify(next));
    const allSeen = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
    const previousSeen = allSeen.find((s) => s.id === q.id);
    const seen = allSeen.filter((s) => s.id !== q.id);
    safeSet(
      APP_CONFIG.seenKey,
      JSON.stringify([
        ...seen,
        {
          id: q.id,
          lastSeen: new Date().toISOString(),
          count: previousSeen?.count ?? 1,
          correct,
          fingerprint: previousSeen?.fingerprint ?? q.fingerprint,
          factKey: previousSeen?.factKey,
          optionSetKey: previousSeen?.optionSetKey ?? questionOptionSetKey(q),
          optionTexts:
            previousSeen?.optionTexts ??
            q.options.map((option) => normalizeText(option.text)),
          templateKey: previousSeen?.templateKey ?? questionTemplateKey(q),
        },
      ]),
    );
    tone(
      correct ? (p.streak + 1 >= 3 ? "streak" : "correct") : "wrong",
      settings.sound,
    );
    if (settings.haptics) navigator.vibrate?.(correct ? 30 : [40, 30, 40]);
  };
  const reportQuestion = async (
    questionId: string,
    reason: QuestionReportReason,
    note?: string,
  ) => {
    trackEvent("question_reported", [
      game?.questions.find((question) => question.id === questionId)
        ?.categoryId ?? "",
    ]);
    const reportedQuestion = game?.questions.find(
      (question) => question.id === questionId,
    );
    const report: LocalQuestionReport = {
      id: crypto.randomUUID(),
      questionId,
      reason,
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
      synced: false,
      prompt: reportedQuestion?.prompt,
      options: reportedQuestion?.options,
      correctOptionId: reportedQuestion?.correctOptionId,
      explanation: reportedQuestion?.explanation,
    };
    const stored = load<LocalQuestionReport[]>(APP_CONFIG.reportsKey, []);
    safeSet(
      APP_CONFIG.reportsKey,
      JSON.stringify([report, ...stored].slice(0, 100)),
    );
    void fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId, reason, note: report.note }),
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!result?.stored) return;
        const next = load<LocalQuestionReport[]>(APP_CONFIG.reportsKey, []).map(
          (item) => (item.id === report.id ? { ...item, synced: true } : item),
        );
        safeSet(APP_CONFIG.reportsKey, JSON.stringify(next));
      })
      .catch(() => {
        // Offline-rapporter bliver liggende lokalt på enheden.
      });
  };
  const nextQuestion = () => {
    if (!game) return;
    if (game.index === game.questions.length - 1) return finish(game);
    const next = {
      ...game,
      index: game.index + 1,
      activePlayerIndex:
        (game.activePlayerIndex + 1) % game.setup.players.length,
      riskMultiplier: 1,
      hiddenOptionIds: [],
    };
    setGame(next);
    safeSet(APP_CONFIG.gameKey, JSON.stringify(next));
    tone("tap", settings.sound);
  };
  const skipSeenQuestion = () => {
    if (!game) return false;
    const currentQuestion = game.questions[game.index];
    if (game.answers.some((answer) => answer.questionId === currentQuestion.id))
      return false;
    const seen = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
    const replacement = selectReplacementQuestion(
      questionBank,
      game.questions,
      game.setup,
      seen,
    );
    if (!replacement) return false;
    const questions = [...game.questions];
    questions[game.index] = {
      ...replacement,
      finale: currentQuestion.finale,
    };
    const next = { ...game, questions, hiddenOptionIds: [] };
    setGame(next);
    safeSet(APP_CONFIG.gameKey, JSON.stringify(next));
    safeSet(
      APP_CONFIG.seenKey,
      JSON.stringify(
        reserveSeenQuestions(seen, [replacement.id], new Date().toISOString(), [
          replacement,
        ]),
      ),
    );
    tone("tap", settings.sound);
    return true;
  };
  const useLifeline = () => {
    if (!game || !game.setup.lifelines) return;
    const question = game.questions[game.index];
    const player = game.setup.players[game.activePlayerIndex];
    const alreadyAnswered = game.answers.some(
      (item) => item.questionId === question.id,
    );
    const remaining = game.lifelinesRemaining?.[player.id] ?? 3;
    if (
      alreadyAnswered ||
      remaining < 1 ||
      game.hiddenOptionIds?.length ||
      question.type === "ordering" ||
      question.options.length !== 4 ||
      !question.correctOptionId
    )
      return;
    const hiddenOptionIds = shuffle(
      question.options.filter(
        (option) => option.id !== question.correctOptionId,
      ),
    )
      .slice(0, 2)
      .map((option) => option.id);
    const next = {
      ...game,
      hiddenOptionIds,
      lifelinesRemaining: {
        ...game.lifelinesRemaining,
        [player.id]: remaining - 1,
      },
    };
    setGame(next);
    safeSet(APP_CONFIG.gameKey, JSON.stringify(next));
    tone("tap", settings.sound);
  };
  const content =
    view === "home" ? (
      <Home
        game={game}
        history={history}
        reducedMotion={settings.reducedMotion}
        go={go}
        quick={quick}
        playDaily={playDaily}
        daily={daily}
        todayKey={todayKey}
        busy={questionBankLoading}
        best={bests["solo-10"]}
      />
    ) : view === "setup" ? (
      <Setup
        setup={setup}
        setSetup={setSetup}
        step={step}
        setStep={setStep}
        start={start}
        startError={startError}
        questionsReady={!questionBankLoading}
        go={go}
      />
    ) : view === "play" && game ? (
      <Play
        key={game.questions[game.index].id}
        game={game}
        sound={settings.sound}
        answer={answer}
        next={nextQuestion}
        report={reportQuestion}
        skip={skipSeenQuestion}
        useLifeline={useLifeline}
        setRisk={(n) => {
          const g = { ...game, riskMultiplier: n };
          setGame(g);
          safeSet(APP_CONFIG.gameKey, JSON.stringify(g));
        }}
      />
    ) : view === "results" && game ? (
      <Results
        key={game.id}
        game={game}
        go={go}
        replay={() => (game.dailyKey ? quick() : void start(game.setup))}
        playLevel={playLevel}
        record={record}
        streak={daily ? activeDailyStreak(daily, game.dailyKey ?? todayKey) : 0}
        busy={questionBankLoading}
      />
    ) : view === "history" ? (
      <HistoryView items={history} go={go} />
    ) : view === "stats" ? (
      <StatsView
        history={history}
        go={go}
        busy={questionBankLoading}
        train={(ids) => quick(ids)}
      />
    ) : view === "settings" ? (
      <SettingsView
        value={settings}
        onChange={setSettings}
        setup={setup}
        onRestore={(payload) => {
          const restored = restoreSetup(payload.setup);
          setSetup(restored);
          safeSet(APP_CONFIG.setupKey, JSON.stringify(restored));
          safeSet(APP_CONFIG.seenKey, JSON.stringify(payload.seen));
        }}
        go={go}
      />
    ) : view === "review" && game ? (
      <Review game={game} go={go} />
    ) : (
      <Help
        go={go}
        installContext={installContext}
        canInstall={Boolean(installPrompt)}
        install={async () => {
          if (!installPrompt) return;
          await installPrompt.prompt();
          await installPrompt.userChoice;
          setInstallPrompt(null);
        }}
      />
    );
  return (
    <main
      className={`min-h-dvh safe-shell ${view === "play" ? "playing" : ""}`}
    >
      <TopBar
        view={view}
        settings={settings}
        setSettings={setSettings}
        go={go}
      />
      {view === "home" && (
        <div className="home-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      <motion.div
        key={view}
        // Forsiden vises straks ved første indlæsning; kun skift mellem
        // skærme får en kort overgang.
        initial={
          settings.reducedMotion || !hydrated ? false : { opacity: 0, y: 8 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 w-full px-4 pb-12 pt-4 sm:px-6 ${
          view === "home" ? "" : "mx-auto max-w-5xl"
        } ${view === "play" ? "quiz-shell" : ""}`}
      >
        {content}
      </motion.div>
    </main>
  );
}

function TopBar({
  view,
  settings,
  setSettings,
  go,
}: {
  view: View;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  go: (v: View) => void;
}) {
  return (
    <header className="app-topbar sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div
        className={`mx-auto flex h-20 max-w-5xl items-center px-4 sm:px-6 ${
          view === "home" ? "justify-end" : "justify-between"
        }`}
      >
        {view !== "home" && (
          <button
            onClick={() => go("home")}
            className="flex min-h-11 items-center text-left"
          >
            <BrandLockup compact />
          </button>
        )}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={settings.sound ? "Slå lyd fra" : "Slå lyd til"}
            onClick={() => setSettings({ ...settings, sound: !settings.sound })}
          >
            {settings.sound ? <Sound2 /> : <SoundOff />}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Åbn menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-border/25">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 grid gap-2">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("stats")}
                  >
                    <BarChart3 />
                    Statistik
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("history")}
                  >
                    <History />
                    Historik
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("help")}
                  >
                    <BookOpen />
                    Sådan spiller I
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("settings")}
                  >
                    <Settings />
                    Indstillinger
                  </Button>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
function DailyButton({
  daily,
  todayKey,
  busy,
  onClick,
}: {
  daily: DailyProgress;
  todayKey: string;
  busy: boolean;
  onClick: () => void;
}) {
  const done = daily.results[todayKey];
  const streak = activeDailyStreak(daily, todayKey);
  return (
    <Button
      size="lg"
      variant={done ? "ghost" : "secondary"}
      className={`daily-button h-14 text-base ${done ? "done" : ""}`}
      disabled={busy || Boolean(done)}
      onClick={onClick}
    >
      <CalendarCheck />
      {done
        ? `Dagens quiz klaret · ${done.correct}/${done.total}`
        : "Dagens quiz"}
      {!done && <small className="daily-sub">samme ti til alle</small>}
      {streak > 0 && (
        <span className="daily-streak" aria-label={`${streak} dage i træk`}>
          <Flame aria-hidden="true" />
          {streak}
        </span>
      )}
    </Button>
  );
}
function Home({
  game,
  history,
  reducedMotion,
  go,
  quick,
  playDaily,
  daily,
  todayKey,
  busy,
  best,
}: {
  game: Game | null;
  history: GameResult[];
  reducedMotion: boolean;
  go: (v: View) => void;
  quick: () => void;
  playDaily: () => void;
  daily: DailyProgress | null;
  todayKey: string;
  busy: boolean;
  best?: BestScore;
}) {
  return (
    <div className="home-grid">
      <section className="relative z-10 mx-auto w-full max-w-5xl py-10 sm:py-20">
        <motion.div
          className="home-hero-brand"
          animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <BrandLockup />
        </motion.div>
        <h1 className="max-w-2xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl">
          Quiz-aftenen starter <span className="text-primary">her.</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground">
          <strong className="text-foreground">{APP_CONFIG.tagline}.</strong>{" "}
          Dansk multiplayer quiz på én skærm.
        </p>
        <div className="home-actions mt-9 grid gap-3 sm:max-w-md">
          <Button
            size="lg"
            className="h-14 text-base"
            onClick={() => go("setup")}
          >
            <Gamepad2 />
            Start nyt spil
            <ArrowRight />
          </Button>
          {game && !game.completedAt && (
            <Button
              size="lg"
              variant="secondary"
              className="h-14"
              onClick={() => go("play")}
            >
              <RefreshCw />
              Fortsæt spil · {game.index + 1}/{game.questions.length}
            </Button>
          )}
          {daily && todayKey && (
            <DailyButton
              daily={daily}
              todayKey={todayKey}
              busy={busy}
              onClick={playDaily}
            />
          )}
          <Button
            size="lg"
            variant="secondary"
            className="h-14 text-base"
            disabled={busy}
            onClick={() => quick()}
          >
            <Zap />
            {busy ? "Finder spørgsmål…" : "Hurtigt spil · 10 spørgsmål"}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12"
            onClick={() => go("help")}
          >
            <BookOpen />
            Sådan spiller I
          </Button>
        </div>
        {(best || history.length > 0) && (
          <p className="home-stats">
            {best && (
              <span>
                <Trophy aria-hidden="true" />
                Rekord i hurtigt spil: {best.correct} af {best.total}
              </span>
            )}
            {history.length > 0 && (
              <span>
                <History aria-hidden="true" />
                {history.length} spil spillet
              </span>
            )}
          </p>
        )}
      </section>
      <aside className="relative z-10 hidden min-h-[520px] items-center justify-center lg:flex">
        <div className="hero-orbit">
          <div className="hero-score">
            <Trophy />
            <b>{history.length}</b>
            <span>spil spillet</span>
          </div>
          {["🧠", "🎵", "🌍", "🎬"].map((x, i) => (
            <span key={x} style={{ "--i": i } as React.CSSProperties}>
              {x}
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
}
function Setup({
  setup,
  setSetup,
  step,
  setStep,
  start,
  startError,
  questionsReady,
  go,
}: {
  setup: GameSetup;
  setSetup: (s: GameSetup) => void;
  step: number;
  setStep: (n: number) => void;
  start: (s?: GameSetup) => Promise<void>;
  startError: string | null;
  questionsReady: boolean;
  go: (v: View) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = CATEGORIES.filter((c) =>
    c.name.toLocaleLowerCase("da").includes(search.toLocaleLowerCase("da")),
  );
  const questionCounts = fairQuestionCounts(setup.players.length);
  const displayedQuestionCount = closestFairQuestionCount(
    setup.mode === "quick" ? 10 : setup.questionCount,
    setup.players.length,
  );
  const questionCountIndex = Math.max(
    0,
    questionCounts.indexOf(displayedQuestionCount),
  );
  const renderCategory = (c: (typeof CATEGORIES)[number]) => {
    const selected = setup.categoryIds.includes(c.id),
      fav = setup.favorites.includes(c.id);
    return (
      <div key={c.id} className={`category-card ${selected ? "selected" : ""}`}>
        <button
          aria-pressed={selected}
          onClick={() =>
            setSetup({
              ...setup,
              categoryIds: selected
                ? setup.categoryIds.filter((x) => x !== c.id)
                : [...setup.categoryIds, c.id],
            })
          }
        >
          <span>{c.emoji}</span>
          <b>{c.name}</b>
          {c.niche && <small>Nichekategori · vælg selv</small>}
          {selected && (
            <i className="category-check" aria-hidden="true">
              <Check />
            </i>
          )}
        </button>
        <button
          className={`fav ${fav ? "active" : ""}`}
          aria-label={`Favorit: ${c.name}`}
          onClick={() =>
            setSetup({
              ...setup,
              favorites: fav
                ? setup.favorites.filter((x) => x !== c.id)
                : [...setup.favorites, c.id],
            })
          }
        >
          <Heart fill={fav ? "currentColor" : "none"} />
        </button>
      </div>
    );
  };
  const add = () =>
    setSetup({
      ...setup,
      players: [
        ...setup.players,
        newPlayer(
          setup.mode === "teams"
            ? `Hold ${setup.players.length + 1}`
            : `Spiller ${setup.players.length + 1}`,
          setup.players.length,
        ),
      ],
    });
  return (
    <>
      <PageHead
        title="Opret spil"
        onBack={() => (step ? setStep(step - 1) : go("home"))}
        kicker={`Trin ${step + 1} af 3`}
      />
      {startError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm"
        >
          <b>Kunne ikke starte quizzen</b>
          <p className="mt-1 text-muted-foreground">{startError}</p>
        </div>
      )}
      <Progress
        value={((step + 1) / 3) * 100}
        className="mb-7"
        aria-label={`Trin ${step + 1} af 3`}
      />
      {step === 0 && (
        <div className="step-enter space-y-8">
          <section>
            <Label className="mb-3 block text-base">Spilleform</Label>
            <div
              className="mode-grid"
              role="radiogroup"
              aria-label="Spilleform"
            >
              {modes.map((m) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={setup.mode === m.id}
                  key={m.id}
                  className={`mode-card ${setup.mode === m.id ? "selected" : ""}`}
                  onClick={() => {
                    const solo = m.id === "solo";
                    // Standardnavne følger spilleformen: Hold 1 / Spiller 1.
                    const [from, to] =
                      m.id === "teams"
                        ? [/^Spiller (\d+)$/, "Hold"]
                        : [/^Hold (\d+)$/, "Spiller"];
                    const named = (
                      setup.players.length < 2 && !solo
                        ? [...setup.players, newPlayer("Spiller 2", 1)]
                        : setup.players
                    ).map((player) => ({
                      ...player,
                      name: player.name.replace(from, `${to} $1`),
                    }));
                    setSetup({
                      ...setup,
                      mode: m.id,
                      players: solo ? [named[0]] : named,
                    });
                  }}
                >
                  <span>{m.icon}</span>
                  <b>{m.title}</b>
                  <small>{m.text}</small>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-base">
                {setup.mode === "teams" ? "Hold" : "Spillere"}
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSetup({ ...setup, players: shuffle(setup.players) })
                }
              >
                <Shuffle />
                Bland rækkefølge
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {setup.players.map((p, i) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Sheet>
                      <SheetTrigger asChild>
                        <button
                          className="avatar-button"
                          aria-label={`Vælg dyr for ${p.name}`}
                        >
                          {p.avatar}
                        </button>
                      </SheetTrigger>
                      <SheetContent
                        side="bottom"
                        className="pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                      >
                        <SheetHeader>
                          <SheetTitle>Vælg dyr til {p.name}</SheetTitle>
                        </SheetHeader>
                        <div className="grid grid-cols-6 gap-2 px-4 pb-5 sm:grid-cols-8 md:grid-cols-12">
                          {ANIMAL_AVATARS.map((avatar) => (
                            <SheetClose asChild key={avatar}>
                              <button
                                className={`grid aspect-square min-h-11 min-w-11 place-items-center rounded-xl text-2xl transition hover:bg-muted ${p.avatar === avatar ? "bg-primary/15 ring-2 ring-primary" : "bg-secondary"}`}
                                aria-label={`Vælg ${avatar}`}
                                aria-pressed={p.avatar === avatar}
                                onClick={() =>
                                  setSetup({
                                    ...setup,
                                    players: setup.players.map((player) =>
                                      player.id === p.id
                                        ? { ...player, avatar }
                                        : player,
                                    ),
                                  })
                                }
                              >
                                {avatar}
                              </button>
                            </SheetClose>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                    <Input
                      aria-label={`Navn på ${i + 1}`}
                      value={p.name}
                      onChange={(e) =>
                        setSetup({
                          ...setup,
                          players: setup.players.map((x) =>
                            x.id === p.id ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    {setup.players.length > (setup.mode === "solo" ? 1 : 2) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Fjern"
                        onClick={() =>
                          setSetup({
                            ...setup,
                            players: setup.players.filter((x) => x.id !== p.id),
                          })
                        }
                      >
                        <X />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {setup.players.length < (setup.mode === "teams" ? 6 : 12) &&
              setup.mode !== "solo" && (
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={add}
                >
                  + Tilføj {setup.mode === "teams" ? "hold" : "spiller"}
                </Button>
              )}
          </section>
        </div>
      )}
      {step === 1 && (
        <div className="step-enter">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setSetup({ ...setup, categoryIds: CATEGORIES.map((c) => c.id) })
              }
            >
              Vælg alle
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSetup({ ...setup, categoryIds: [] })}
            >
              Fravælg alle
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setSetup({
                  ...setup,
                  categoryIds: shuffle(DEFAULT_CATEGORIES)
                    .slice(0, 8)
                    .map((c) => c.id),
                })
              }
            >
              <Shuffle />
              Tilfældig blanding
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setSetup({ ...setup, categoryIds: DANISH_CATEGORY_IDS })
              }
            >
              🇩🇰 Kun dansk
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Søg i kategorier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim() ? (
            <div className="category-grid">{filtered.map(renderCategory)}</div>
          ) : (
            <div className="grid gap-7">
              {CATEGORY_GROUPS.map((group) => {
                const members = group.ids
                  .map((id) => CATEGORIES.find((c) => c.id === id))
                  .filter((c): c is NonNullable<typeof c> => Boolean(c));
                const picked = members.filter((c) =>
                  setup.categoryIds.includes(c.id),
                ).length;
                const all = picked === members.length;
                return (
                  <section key={group.name} className="category-group">
                    <header>
                      <h2>
                        <span aria-hidden="true">{group.emoji}</span>
                        {group.name}
                      </h2>
                      <small>
                        {picked}/{members.length}
                      </small>
                      <button
                        type="button"
                        onClick={() =>
                          setSetup({
                            ...setup,
                            categoryIds: all
                              ? setup.categoryIds.filter(
                                  (id) => !group.ids.includes(id),
                                )
                              : [
                                  ...new Set([
                                    ...setup.categoryIds,
                                    ...members.map((c) => c.id),
                                  ]),
                                ],
                          })
                        }
                      >
                        {all ? "Fravælg" : "Vælg alle"}
                      </button>
                    </header>
                    <div className="category-grid">
                      {members.map(renderCategory)}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {setup.categoryIds.length} kategorier valgt · favoritter optræder
            oftere
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="step-enter grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Antal spørgsmål</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-end justify-between gap-4">
                <b className="text-4xl">{displayedQuestionCount}</b>
                <span className="text-right text-sm text-muted-foreground">
                  {displayedQuestionCount / setup.players.length} spørgsmål pr.{" "}
                  {setup.mode === "teams" ? "hold" : "spiller"}
                </span>
              </div>
              <Slider
                aria-label="Antal spørgsmål"
                min={0}
                max={Math.max(0, questionCounts.length - 1)}
                step={1}
                value={[questionCountIndex]}
                disabled={questionCounts.length < 2}
                onValueChange={([index]) =>
                  setSetup({
                    ...setup,
                    questionCount:
                      questionCounts[index] ?? displayedQuestionCount,
                  })
                }
              />
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>{questionCounts[0]}</span>
                <span>{questionCounts.at(-1)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sværhedsgrad</CardTitle>
                <InfoHint
                  label="Om sværhedsforløb"
                  text="Fast holder samme niveau. Blandet varierer mellem niveauet lige under, det valgte niveau og niveauet lige over. Stigende starter lidt lettere og bliver gradvist sværere."
                />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="level-picker"
                role="radiogroup"
                aria-label="Sværhedsgrad"
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={setup.difficulty === level}
                    className={`level-option ${setup.difficulty === level ? "selected" : ""}`}
                    onClick={() => setSetup({ ...setup, difficulty: level })}
                  >
                    <span aria-hidden="true">{"●".repeat(level)}</span>
                    <b>{DIFFICULTY_LABELS[level]}</b>
                  </button>
                ))}
              </div>
              <p className="level-hint">{LEVEL_HINTS[setup.difficulty]}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {difficultyModes.map((option) => (
                  <Button
                    size="sm"
                    key={option.id}
                    className="w-full px-2"
                    variant={
                      setup.difficultyMode === option.id ? "secondary" : "ghost"
                    }
                    onClick={() =>
                      setSetup({ ...setup, difficultyMode: option.id })
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Tilføjelser</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 pt-0 sm:grid-cols-2 lg:grid-cols-3">
              <Toggle
                label="Vis 30 sek. timer"
                info="Viser en nedtælling. Tiden giver ikke ekstra point, medmindre Tidsbonus også slås til."
                checked={setup.timer}
                on={(v) =>
                  setSetup({
                    ...setup,
                    timer: v,
                    timeBonus: v ? setup.timeBonus : false,
                  })
                }
              />
              <Toggle
                label="Tidsbonus"
                info="Giver op til 50 ekstra point for et hurtigt korrekt svar og slår automatisk timeren til."
                checked={setup.timeBonus}
                on={(v) =>
                  setSetup({ ...setup, timeBonus: v, timer: v || setup.timer })
                }
              />
              <Toggle
                label="Streakbonus"
                info="Giver 25 ekstra point pr. svar i den aktuelle sejrsrække, op til 75 bonuspoint."
                checked={setup.streakBonus}
                on={(v) => setSetup({ ...setup, streakBonus: v })}
              />
              <Toggle
                label="Minuspoint"
                info="Forkerte svar kan koste point. Risiko med 2× eller 3× kan stadig koste point efter sine egne regler."
                checked={setup.minusPoints}
                on={(v) => setSetup({ ...setup, minusPoints: v })}
              />
              <Toggle
                label="Finale Dobbelt Point"
                info="Hver spiller eller hvert hold får dobbelt point på sit sidste spørgsmål."
                checked={setup.finale}
                on={(v) => setSetup({ ...setup, finale: v })}
              />
              <Toggle
                label="3 livslinjer"
                info="Hver spiller eller hvert hold får tre 50/50-livslinjer, som fjerner to forkerte svar."
                checked={setup.lifelines}
                on={(v) => setSetup({ ...setup, lifelines: v })}
              />
            </CardContent>
          </Card>
        </div>
      )}
      <div className="sticky bottom-3 mt-8 flex gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur">
        <Button
          variant="ghost"
          onClick={() => (step ? setStep(step - 1) : go("home"))}
        >
          <ArrowLeft />
          Tilbage
        </Button>
        {step < 2 ? (
          <Button
            className="ml-auto"
            disabled={step === 1 && !setup.categoryIds.length}
            onClick={() => setStep(step + 1)}
          >
            Fortsæt
            <ArrowRight />
          </Button>
        ) : (
          <Button
            className="ml-auto"
            disabled={
              !questionsReady ||
              setup.players.some((p) => !p.name.trim()) ||
              !setup.categoryIds.length
            }
            onClick={() => start()}
          >
            {questionsReady ? "Start quizzen" : "Gør spørgsmål klar…"}
            <ArrowRight />
          </Button>
        )}
      </div>
    </>
  );
}
function AnimatedNumber({
  value,
  from,
  duration = 520,
  suffix = "",
}: {
  value: number;
  from?: number;
  duration?: number;
  suffix?: string;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(from ?? value);
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const start = shown.current;
    const format = (n: number) =>
      `${Math.round(n).toLocaleString("da-DK")}${suffix}`;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");
    if (start === value || reduced) {
      shown.current = value;
      element.textContent = format(value);
      return;
    }
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - (1 - t) ** 3;
      shown.current = start + (value - start) * eased;
      element.textContent = format(shown.current);
      if (t < 1) frame = requestAnimationFrame(step);
      else shown.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, suffix]);
  return (
    <span ref={node} className="tabular-nums">
      {Math.round(from ?? value).toLocaleString("da-DK")}
      {suffix}
    </span>
  );
}
const CORRECT_LINES = [
  "Rigtigt!",
  "Sådan!",
  "Lige i øjet!",
  "Præcis!",
  "Helt rigtigt!",
  "Flot klaret!",
];
const WRONG_LINES = ["Ikke helt", "Desværre", "Den drillede", "Åh nej"];
// Point uden fuldt rigtigt svar: fx «nærmest vinder»-spørgsmål.
const PARTIAL_LINES = ["Tæt på!", "Næsten!"];
function lineFor(lines: string[], seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length];
}
function Play({
  game,
  sound,
  answer,
  next,
  setRisk,
  report,
  skip,
  useLifeline,
}: {
  game: Game;
  sound: boolean;
  answer: (id: string, ms: number) => void;
  next: () => void;
  skip: () => boolean;
  setRisk: (n: number) => void;
  useLifeline: () => void;
  report: (
    questionId: string,
    reason: QuestionReportReason,
    note?: string,
  ) => Promise<void>;
}) {
  const q = game.questions[game.index],
    p = game.setup.players[game.activePlayerIndex],
    given = game.answers.find((a) => a.questionId === q.id);
  const total = game.questions.length;
  const solo = game.setup.players.length === 1;
  const isLast = game.index === total - 1;
  const nextPlayer =
    game.setup.players[
      (game.activePlayerIndex + 1) % game.setup.players.length
    ];
  const hiddenOptionIds = new Set(game.hiddenOptionIds ?? []);
  const visibleOptions = q.options.filter(
    (option) => !hiddenOptionIds.has(option.id),
  );
  const lifelinesLeft = game.lifelinesRemaining?.[p.id] ?? 3;
  const canUseLifeline =
    game.setup.lifelines &&
    !given &&
    lifelinesLeft > 0 &&
    hiddenOptionIds.size === 0 &&
    q.type !== "ordering" &&
    q.options.length === 4 &&
    Boolean(q.correctOptionId);
  const started = useRef(0);
  const nextButton = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const [scoreAtMount] = useState(() => p.score - (given?.points ?? 0));
  const [order, setOrder] = useState<string[]>([]),
    [reportOpen, setReportOpen] = useState(false),
    [reportReason, setReportReason] = useState<QuestionReportReason>("unclear"),
    [reportNote, setReportNote] = useState(""),
    [reportSent, setReportSent] = useState(false),
    [skipUnavailable, setSkipUnavailable] = useState(false),
    [secondsLeft, setSecondsLeft] = useState(30);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  useEffect(() => {
    if (!(game.setup.timer || game.setup.timeBonus) || given) return;
    const interval = window.setInterval(() => {
      setSecondsLeft(
        Math.max(0, 30 - Math.floor((Date.now() - started.current) / 1000)),
      );
    }, 250);
    return () => window.clearInterval(interval);
  }, [game.setup.timer, game.setup.timeBonus, given]);
  useEffect(() => {
    // Et diskret tik i de sidste fem sekunder, når nedtællingen er slået til.
    if (!(game.setup.timer || game.setup.timeBonus) || given) return;
    if (secondsLeft > 0 && secondsLeft <= 5) tone("tick", sound);
  }, [secondsLeft, game.setup.timer, game.setup.timeBonus, given, sound]);
  const answered = Boolean(given);
  useEffect(() => {
    if (!answered) return;
    // Fokus på Videre gør, at Enter og mellemrum fører direkte videre, og på
    // små skærme rulles forklaringen ind i billedet.
    nextButton.current?.focus({ preventScroll: true });
    feedback.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [answered]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
        return;
      if (
        target &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.isContentEditable)
      )
        return;
      if (given) {
        // Knapper håndterer selv Enter og mellemrum.
        const onButton = Boolean(target?.closest("button, a"));
        if (
          event.key === "ArrowRight" ||
          (!onButton && (event.key === "Enter" || event.key === " "))
        ) {
          event.preventDefault();
          next();
        }
        return;
      }
      if (q.type === "ordering") return;
      const key = event.key.toLowerCase();
      const index =
        "1234".indexOf(key) >= 0 ? "1234".indexOf(key) : "abcd".indexOf(key);
      const option = key.length === 1 ? visibleOptions[index] : undefined;
      if (!option) return;
      event.preventDefault();
      answer(option.id, Date.now() - started.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const cat = categoryById(q.categoryId);
  const correctOption = q.options.find(
    (option) => option.id === q.correctOptionId,
  );
  const results = game.questions.map(
    (question) =>
      game.answers.find((item) => item.questionId === question.id)?.correct,
  );
  const modeTitle =
    modes.find((mode) => mode.id === game.setup.mode)?.title ?? "Quiz";
  return (
    <div className="quiz-screen mx-auto max-w-3xl">
      <div className="quiz-heading mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <small className="text-muted-foreground">
            {solo ? modeTitle : `Spørgsmål ${game.index + 1} af ${total}`}
          </small>
          <h1 className="truncate text-lg font-bold">
            {solo
              ? `Spørgsmål ${game.index + 1} af ${total}`
              : `${p.avatar} ${p.name}s tur`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {p.streak >= 2 && (
            <span
              key={p.streak}
              className="streak-chip"
              role="status"
              aria-label={`${p.streak} rigtige i træk`}
            >
              <Flame aria-hidden="true" />
              {p.streak} i træk
            </span>
          )}
          <div
            className={`score-pill active ${given ? (given.points > 0 ? "gain" : given.points < 0 ? "loss" : "") : ""}`}
            role="status"
            aria-label={`${p.name}s point`}
          >
            <span>{p.avatar}</span>
            <b>
              <AnimatedNumber value={p.score} from={scoreAtMount} />
            </b>
            {given && given.points !== 0 && (
              <i className="points-pop" aria-hidden="true">
                {given.points > 0 ? "+" : ""}
                {given.points.toLocaleString("da-DK")}
              </i>
            )}
          </div>
        </div>
      </div>
      {total <= 20 ? (
        <div
          className="progress-dots"
          role="progressbar"
          aria-label="Fremdrift"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={game.index + 1}
        >
          {results.map((correct, index) => (
            <span
              key={game.questions[index].id}
              className={
                correct === true
                  ? "right"
                  : correct === false
                    ? "miss"
                    : index === game.index
                      ? "now"
                      : ""
              }
            />
          ))}
        </div>
      ) : (
        <Progress
          value={((game.index + 1) / total) * 100}
          aria-label="Fremdrift"
        />
      )}
      {(game.setup.timer || game.setup.timeBonus) && !given && (
        <div className="mt-4" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Clock3 className="size-4" />
              {secondsLeft > 0
                ? game.setup.timeBonus
                  ? "Tid til bonus"
                  : "Tid tilbage"
                : "Tiden er gået – svar stadig"}
            </span>
            <b className={secondsLeft <= 5 ? "timer-urgent" : ""}>
              {secondsLeft} sek.
            </b>
          </div>
          <Progress
            className="timer-progress"
            value={(secondsLeft / 30) * 100}
            aria-label="Resterende svartid"
          />
        </div>
      )}
      {game.setup.mode === "risk" && !given && (
        <div className="my-5 flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Vælg risiko:</span>
          {[1, 2, 3].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={game.riskMultiplier === n ? "default" : "outline"}
              onClick={() => setRisk(n)}
            >
              {n}×
            </Button>
          ))}
        </div>
      )}
      {game.setup.lifelines && !given && (
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={!canUseLifeline}
            onClick={useLifeline}
            title={
              canUseLifeline
                ? "Fjern to forkerte svar"
                : lifelinesLeft < 1
                  ? "Ingen livslinjer tilbage"
                  : "50/50 kan ikke bruges på denne spørgsmålstype"
            }
          >
            <LifeBuoy />
            50/50 · {lifelinesLeft} tilbage
          </Button>
        </div>
      )}
      <Card className="question-card mt-5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge style={{ borderColor: cat?.color }} variant="outline">
              {game.setup.mode === "mystery" && !given
                ? "🎁 Mystery Mix"
                : `${cat?.emoji} ${cat?.name}`}
            </Badge>
            <Badge variant="secondary">
              {DIFFICULTY_LABELS[q.difficulty] ?? `Niveau ${q.difficulty}`}
            </Badge>
            {typeLabels[q.type] && (
              <Badge className="quiz-type-badge" variant="outline">
                {typeLabels[q.type]}
              </Badge>
            )}
            {(q.finale || q.type === "finale") && (
              <Badge>Finale · dobbelt point</Badge>
            )}
            {!given && (
              <Button
                aria-label="Byt et spørgsmål, I allerede har set"
                className="ml-auto h-8 min-h-8 gap-1 px-2 text-xs text-muted-foreground opacity-85 hover:opacity-100"
                size="sm"
                title="Behold turen og få et nyt spørgsmål"
                variant="ghost"
                onClick={() => setSkipUnavailable(!skip())}
              >
                <RefreshCw className="size-3" />
                Set før? Byt
              </Button>
            )}
          </div>
          {skipUnavailable && (
            <small className="text-right text-muted-foreground" role="status">
              Der er ikke et andet ubrugt spørgsmål i den valgte pulje.
            </small>
          )}
          <CardTitle className="question-title pt-4 text-2xl leading-tight sm:text-[2rem]">
            <QuizText>{q.prompt}</QuizText>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {visibleOptions.map((o, i) => {
            const selected = given?.optionId === o.id,
              correct = o.id === q.correctOptionId,
              orderIndex = order.indexOf(o.id);
            const state =
              q.type === "ordering"
                ? given
                  ? given.correct
                    ? "correct"
                    : "wrong"
                  : orderIndex >= 0
                    ? "picked"
                    : ""
                : !given
                  ? ""
                  : correct
                    ? "correct"
                    : selected
                      ? "wrong"
                      : "dim";
            return (
              <Button
                key={o.id}
                variant="outline"
                disabled={!!given}
                style={{ "--i": i } as React.CSSProperties}
                onClick={() =>
                  q.type === "ordering"
                    ? setOrder((current) =>
                        current.includes(o.id)
                          ? current.filter((id) => id !== o.id)
                          : [...current, o.id],
                      )
                    : answer(o.id, Date.now() - started.current)
                }
                className={`answer-button ${state}`}
              >
                <span>
                  {q.type === "ordering" && orderIndex >= 0
                    ? orderIndex + 1
                    : String.fromCharCode(65 + i)}
                </span>
                <b>
                  <QuizOptionText prompt={q.prompt}>{o.text}</QuizOptionText>
                </b>
                {state === "correct" && (
                  <Check className="answer-mark ml-auto" />
                )}
                {state === "wrong" && <X className="answer-mark ml-auto" />}
              </Button>
            );
          })}
          {q.type === "ordering" && !given && (
            <div className="mt-2 flex gap-2">
              <Button
                className="flex-1"
                disabled={order.length !== q.options.length}
                onClick={() =>
                  answer(order.join("|"), Date.now() - started.current)
                }
              >
                Lås rækkefølgen
              </Button>
              <Button variant="ghost" onClick={() => setOrder([])}>
                Nulstil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {q.type !== "ordering" && (
        <p className="key-hint" aria-hidden="true">
          Tryk 1–4 for at svare · Enter for næste spørgsmål
        </p>
      )}
      {given && (
        <div
          ref={feedback}
          role="status"
          aria-live="polite"
          className={`feedback ${given.correct ? "good" : "bad"}`}
        >
          <div className="min-w-0">
            <b className="feedback-title">
              {lineFor(
                given.correct
                  ? CORRECT_LINES
                  : given.points > 0
                    ? PARTIAL_LINES
                    : WRONG_LINES,
                q.id,
              )}
              {given.points !== 0 && (
                <span>
                  {given.points > 0 ? "+" : ""}
                  {given.points.toLocaleString("da-DK")} point
                </span>
              )}
            </b>
            {!given.correct && correctOption && q.type !== "ordering" && (
              <p className="feedback-answer">
                Svaret er{" "}
                <strong>
                  <QuizOptionText prompt={q.prompt}>
                    {correctOption.text}
                  </QuizOptionText>
                </strong>
              </p>
            )}
            {q.type === "ordering" && q.correctOrder && (
              <p className="feedback-answer">
                Korrekt rækkefølge:{" "}
                {q.correctOrder
                  .map(
                    (id) => q.options.find((option) => option.id === id)?.text,
                  )
                  .join(" → ")}
              </p>
            )}
            {hasUsefulExplanation(q.explanation) && (
              <p>
                <QuizText>{q.explanation}</QuizText>
              </p>
            )}
          </div>
          <div className="feedback-actions grid gap-2">
            <Button
              ref={nextButton}
              className="next-question-button"
              size="lg"
              onClick={next}
            >
              {isLast
                ? "Se resultatet"
                : solo
                  ? "Næste spørgsmål"
                  : `Videre til ${nextPlayer.name}`}
              <ArrowRight />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={reportSent}
              onClick={() => setReportOpen((value) => !value)}
            >
              <Flag />
              {reportSent ? "Tak for hjælpen" : "Er der noget galt?"}
            </Button>
          </div>
        </div>
      )}
      {given && reportOpen && !reportSent && (
        <Card className="mt-3 border-amber-500/40">
          <CardContent className="grid gap-3 p-4">
            <b>Hvad bør vi se på?</b>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["wrong_answer", "Forkert svar"],
                  ["unclear", "Uklart spørgsmål"],
                  ["difficulty", "Forkert niveau"],
                  ["bad_options", "Dårlige svarmuligheder"],
                  ["outdated", "Forældet information"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={reportReason === value ? "default" : "outline"}
                  onClick={() => setReportReason(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Input
              value={reportNote}
              maxLength={240}
              placeholder="Valgfri kort kommentar"
              onChange={(event) => setReportNote(event.target.value)}
            />
            <Button
              onClick={async () => {
                await report(q.id, reportReason, reportNote);
                setReportSent(true);
                setReportOpen(false);
              }}
            >
              Send rapport
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function soloVerdict(rate: number): [string, string] {
  if (rate >= 1)
    return [
      "Fejlfri runde!",
      "Ikke én eneste fejl. Der er vist en quizmester i huset.",
    ];
  if (rate >= 0.8)
    return [
      "Stærkt spillet!",
      "Det her kunne godt bære en plads på holdet til pubquizzen.",
    ];
  if (rate >= 0.6)
    return ["Godt gået!", "Solidt over middel – og med plads til en revanche."];
  if (rate >= 0.4)
    return [
      "Halvvejs i mål",
      "Nogle sad lige i skabet, andre drillede. Én runde mere?",
    ];
  if (rate >= 0.2)
    return ["Den drillede", "Spørgsmålene vandt denne gang. Tag en omkamp."];
  return ["Av for den", "Herfra kan det kun gå fremad. Prøv igen!"];
}
function Results({
  game,
  go,
  replay,
  playLevel,
  record,
  streak,
  busy,
}: {
  game: Game;
  go: (v: View) => void;
  replay: () => void;
  playLevel: (level: number) => void;
  record: RecordInfo;
  streak: number;
  busy: boolean;
}) {
  const isDaily = Boolean(game.dailyKey);
  const standings = rankPlayers(game.setup.players),
    sorted = standings.map(({ player }) => player),
    winners = standings
      .filter(({ rank }) => rank === 1)
      .map(({ player }) => player),
    winner = winners[0],
    winnerNames = formatNames(winners.map((player) => player.name)),
    sharedWin = winners.length > 1;
  const solo = game.setup.players.length === 1;
  const total = game.answers.length;
  const categoryStats = [
    ...new Set(game.answers.map((answer) => answer.categoryId)),
  ]
    .map((categoryId) => {
      const answers = game.answers.filter(
        (answer) => answer.categoryId === categoryId,
      );
      const correct = answers.filter((answer) => answer.correct).length;
      return {
        categoryId,
        name: categoryById(categoryId)?.name ?? "Ukendt kategori",
        emoji: categoryById(categoryId)?.emoji ?? "",
        correct,
        total: answers.length,
        rate: correct / Math.max(1, answers.length),
      };
    })
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
  const bestCategory = categoryStats.find((stat) => stat.correct > 0);
  const weakestCategory = [...categoryStats]
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
    .find((stat) => stat.correct < stat.total);
  const fastest = [...game.answers]
    .filter((answer) => answer.correct)
    .sort((a, b) => a.responseMs - b.responseMs)[0];
  const questionFor = (id?: string) =>
    game.questions.find((question) => question.id === id);
  const hardestRight = [...game.answers]
    .filter((answer) => answer.correct)
    .sort(
      (a, b) =>
        (questionFor(b.questionId)?.difficulty ?? 0) -
        (questionFor(a.questionId)?.difficulty ?? 0),
    )[0];
  const hardestRightQuestion = questionFor(hardestRight?.questionId);
  const difficultyStats = [1, 2, 3, 4, 5]
    .map((level) => {
      const ids = new Set(
        game.questions
          .filter((question) => question.difficulty === level)
          .map((question) => question.id),
      );
      const answers = game.answers.filter((answer) =>
        ids.has(answer.questionId),
      );
      return {
        level,
        total: answers.length,
        correct: answers.filter((answer) => answer.correct).length,
      };
    })
    .filter((stat) => stat.total > 0);
  const longestStreak = Math.max(
    0,
    ...game.setup.players.map((player) => player.longestStreak),
  );
  const winnerRate = winner.correct / Math.max(1, winner.answers);
  const [soloTitle, soloText] = soloVerdict(winnerRate);
  const summary = sharedWin
    ? "Helt lige kamp – en revanche må afgøre det."
    : winnerRate >= 0.8
      ? `${winner.name} leverede en vaskeægte quizmester-præstation.`
      : winner.longestStreak >= 4
        ? `${winner.name} afgjorde kampen med en stærk stime på ${winner.longestStreak}.`
        : sorted.length > 1 && winner.score - sorted[1].score <= 100
          ? "Det blev afgjort på marginalerne – en revanche ligger lige for."
          : `${winner.name} holdt hovedet koldt og tog sejren.`;
  const topScore = Math.max(1, ...sorted.map((player) => player.score));
  const [copied, setCopied] = useState(false);
  const replayButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Enter starter en ny runde med det samme, uden at siden ruller ned.
    replayButton.current?.focus({ preventScroll: true });
  }, []);
  const grid = (() => {
    const marks = game.questions.map((question) => {
      const given = game.answers.find((a) => a.questionId === question.id);
      return given ? (given.correct ? "🟩" : "🟥") : "⬜";
    });
    const rows: string[] = [];
    for (let i = 0; i < marks.length; i += 10)
      rows.push(marks.slice(i, i + 10).join(""));
    return rows.join("\n");
  })();
  const overallRate =
    total > 0 ? game.answers.filter((a) => a.correct).length / total : 0;
  const level = game.setup.difficulty;
  const nudge =
    !isDaily && total >= 8
      ? overallRate >= 0.85 && level < 5
        ? {
            level: level + 1,
            text: `${Math.round(overallRate * 100)} % rigtige – klar til noget sværere?`,
          }
        : overallRate <= 0.3 && level > 1
          ? {
              level: level - 1,
              text: "Det var en hård omgang. Prøv et lidt lettere niveau?",
            }
          : null
      : null;
  const share = async () => {
    const score = winner.score.toLocaleString("da-DK");
    const [, month, day] = (game.dailyKey ?? "").split("-");
    const text = isDaily
      ? `${APP_CONFIG.name} Dagens quiz ${Number(day)}/${Number(month)}\n${winner.correct}/${total} · ${score} point${streak > 1 ? ` · ${streak} dage i træk` : ""}\n${grid}\nwww.kvizy.dk`
      : solo
        ? `${APP_CONFIG.name} · ${winner.correct}/${total} · ${score} point\n${grid}\nKan du slå det? www.kvizy.dk`
        : sharedWin
          ? `${APP_CONFIG.name}: ${winnerNames} delte førstepladsen med ${score} point!`
          : `${APP_CONFIG.name}: ${winner.name} vandt med ${score} point!`;
    try {
      if (navigator.share)
        await navigator.share({ title: APP_CONFIG.name, text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      // Brugeren fortrød delingen, eller udklipsholderen er utilgængelig.
    }
  };
  const ring = 2 * Math.PI * 52;
  return (
    <div className="results mx-auto max-w-3xl text-center">
      {solo ? (
        <>
          <div
            className="score-ring"
            style={{ "--rate": winnerRate } as React.CSSProperties}
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" />
              <circle
                cx="60"
                cy="60"
                r="52"
                strokeDasharray={ring}
                strokeDashoffset={ring}
              />
            </svg>
            <div>
              <b>
                <AnimatedNumber
                  value={Math.round(winnerRate * 100)}
                  from={0}
                  duration={900}
                  suffix="%"
                />
              </b>
              <span>rigtige</span>
            </div>
          </div>
          <h1 className="reveal mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            {soloTitle}
          </h1>
          <p className="reveal mt-3 text-xl">
            <b>
              {winner.correct} af {total}
            </b>{" "}
            <span className="text-muted-foreground">
              · {winner.score.toLocaleString("da-DK")} point
            </span>
          </p>
          <p className="reveal mx-auto mt-2 max-w-xl text-muted-foreground">
            {soloText}
          </p>
          {isDaily ? (
            <p className="record-badge new">
              <Flame aria-hidden="true" />
              Dagens quiz{streak > 1 ? ` · ${streak} dage i træk` : " klaret"}
            </p>
          ) : record?.isRecord ? (
            <p className="record-badge new">
              <Trophy aria-hidden="true" />
              Ny personlig rekord!
            </p>
          ) : record?.previous ? (
            <p className="record-badge">
              <Trophy aria-hidden="true" />
              Din rekord på {record.previous.total} spørgsmål:{" "}
              {record.previous.correct} rigtige
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="winner-crown">👑</div>
          <Badge>Spillet er slut</Badge>
          <h1 className="reveal mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            {sharedWin
              ? `${winnerNames} deler sejren!`
              : `${winner.name} vinder!`}
          </h1>
          <p className="reveal mx-auto mt-3 max-w-xl text-muted-foreground">
            {summary}
          </p>
          <div className="my-7 grid gap-3 text-left">
            {standings.map(({ player: p, rank }, index) => (
              <Card
                key={p.id}
                className={`standing ${rank === 1 ? "winner-card" : ""}`}
                style={{ "--i": index } as React.CSSProperties}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <i
                    className="standing-bar"
                    style={
                      {
                        "--share": Math.max(0, p.score) / topScore,
                      } as React.CSSProperties
                    }
                  />
                  <b className="w-7 text-xl">{rank}.</b>
                  <span className="text-3xl">{p.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate">{p.name}</b>
                    <p className="text-sm text-muted-foreground">
                      {p.correct} af {p.answers} rigtige · bedste stime{" "}
                      {p.longestStreak}
                    </p>
                  </div>
                  <strong className="text-lg">
                    <AnimatedNumber value={p.score} from={0} duration={800} />
                  </strong>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      <div className="result-stats my-7 grid gap-3 text-left sm:grid-cols-2">
        <ResultStat
          index={0}
          label="Længste stime"
          value={
            longestStreak > 1
              ? `${longestStreak} rigtige i træk`
              : "Ingen stime denne gang"
          }
        />
        <ResultStat
          index={1}
          label="Stærkeste kategori"
          value={
            bestCategory
              ? `${bestCategory.emoji} ${bestCategory.name} · ${bestCategory.correct}/${bestCategory.total}`
              : "Ingen rigtige svar"
          }
        />
        <ResultStat
          index={2}
          label={
            weakestCategory ? "Her er der noget at hente" : "Hurtigste svar"
          }
          value={
            weakestCategory
              ? `${weakestCategory.emoji} ${weakestCategory.name} · ${weakestCategory.correct}/${weakestCategory.total}`
              : fastest
                ? `${(fastest.responseMs / 1000).toFixed(1)} sek.`
                : "Ingen rigtige svar"
          }
        />
        <ResultStat
          index={3}
          label="Flottest klaret"
          value={
            hardestRightQuestion
              ? `${DIFFICULTY_LABELS[hardestRightQuestion.difficulty]}: ${hardestRightQuestion.prompt}`
              : fastest
                ? `Hurtigste svar: ${(fastest.responseMs / 1000).toFixed(1)} sek.`
                : "Næste runde bliver bedre"
          }
        />
      </div>
      {difficultyStats.length > 1 && (
        <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
          {difficultyStats.map((stat) => (
            <Badge key={stat.level} variant="secondary">
              {DIFFICULTY_LABELS[stat.level]}: {stat.correct}/{stat.total}
            </Badge>
          ))}
        </div>
      )}
      {nudge && (
        <div className="level-nudge">
          <p>{nudge.text}</p>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => playLevel(nudge.level)}
          >
            Prøv niveau «{DIFFICULTY_LABELS[nudge.level].toLowerCase()}»
          </Button>
        </div>
      )}
      <div className="result-actions grid gap-3 sm:grid-cols-2">
        <Button
          size="lg"
          className="h-14 text-base sm:col-span-2"
          ref={replayButton}
          disabled={busy}
          onClick={replay}
        >
          <RefreshCw />
          {busy
            ? "Finder nye spørgsmål…"
            : isDaily
              ? "Spil et hurtigt spil"
              : solo
                ? "Spil igen"
                : "Revanche"}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => go("review")}>
          <BookOpen />
          Gennemgå svar
        </Button>
        <Button size="lg" variant="outline" onClick={share}>
          <Share2 />
          {copied ? "Kopieret" : "Del resultat"}
        </Button>
        <Button
          variant="ghost"
          className="sm:col-span-2"
          onClick={() => go("home")}
        >
          Til forsiden
        </Button>
      </div>
    </div>
  );
}
function ResultStat({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  return (
    <Card
      className="result-stat py-0"
      style={{ "--i": index } as React.CSSProperties}
    >
      <CardContent className="px-4 py-3">
        <small className="text-muted-foreground">{label}</small>
        <p className="mt-1 line-clamp-2 font-bold">
          <QuizText>{value}</QuizText>
        </p>
      </CardContent>
    </Card>
  );
}
function Review({ game, go }: { game: Game; go: (v: View) => void }) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  const rows = game.questions.map((q, index) => ({
    q,
    index,
    a: game.answers.find((x) => x.questionId === q.id),
  }));
  const wrongCount = rows.filter(({ a }) => a?.correct === false).length;
  const shown = onlyWrong ? rows.filter(({ a }) => a?.correct === false) : rows;
  return (
    <>
      <PageHead title="Gennemgang" onBack={() => go("results")} />
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter"
      >
        <Button
          size="sm"
          variant={onlyWrong ? "outline" : "default"}
          onClick={() => setOnlyWrong(false)}
        >
          Alle ({rows.length})
        </Button>
        <Button
          size="sm"
          variant={onlyWrong ? "default" : "outline"}
          disabled={wrongCount === 0}
          onClick={() => setOnlyWrong(true)}
        >
          Kun forkerte ({wrongCount})
        </Button>
      </div>
      <div className="grid gap-3">
        {shown.map(({ q, index, a }) => {
          const player = game.setup.players.find(
            (candidate) => candidate.id === a?.playerId,
          );
          const selectedOption = q.options.find(
            (option) => option.id === a?.optionId,
          );
          const correctOption = q.options.find(
            (option) => option.id === q.correctOptionId,
          );
          const category = categoryById(q.categoryId);
          return (
            <Card
              key={q.id}
              className={`review-card ${a?.correct ? "good" : "bad"}`}
            >
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <Badge variant="outline">
                    {category?.emoji} {category?.name}
                  </Badge>
                  <Badge variant="outline">
                    {DIFFICULTY_LABELS[q.difficulty]}
                  </Badge>
                  <span
                    className={`review-verdict ${a?.correct ? "good" : "bad"}`}
                  >
                    {a?.correct ? <Check /> : <X />}
                    {a?.correct ? "Rigtigt" : "Forkert"}
                  </span>
                </div>
                <h2 className="mt-3 font-bold">
                  <QuizText>{q.prompt}</QuizText>
                </h2>
                {player && game.setup.players.length > 1 && (
                  <p className="mt-2 text-sm font-semibold">
                    {player.avatar} {player.name}
                  </p>
                )}
                {!a?.correct && selectedOption && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Dit svar:{" "}
                    <QuizOptionText prompt={q.prompt}>
                      {selectedOption.text}
                    </QuizOptionText>
                  </p>
                )}
                {correctOption && (
                  <p className="mt-1 text-sm">
                    Rigtigt svar:{" "}
                    <strong>
                      <QuizOptionText prompt={q.prompt}>
                        {correctOption.text}
                      </QuizOptionText>
                    </strong>
                  </p>
                )}
                {q.type === "ordering" && q.correctOrder && (
                  <p className="mt-1 text-sm">
                    Rigtig rækkefølge:{" "}
                    <strong>
                      {q.correctOrder
                        .map(
                          (id) =>
                            q.options.find((option) => option.id === id)?.text,
                        )
                        .join(" → ")}
                    </strong>
                  </p>
                )}
                {hasUsefulExplanation(q.explanation) && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <QuizText>{q.explanation}</QuizText>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
function StatsView({
  history,
  go,
  busy,
  train,
}: {
  history: GameResult[];
  go: (v: View) => void;
  busy: boolean;
  train: (categoryIds: string[]) => void;
}) {
  const stats: Stats = computeStats(history);
  const weakest = weakestCategories(stats);
  const sorted = [...stats.categories]
    .filter((category) => category.total >= 2)
    .sort((a, b) => a.rate - b.rate || b.total - a.total);
  return (
    <>
      <PageHead title="Statistik" onBack={() => go("home")} />
      {stats.games === 0 ? (
        <Empty
          icon="📊"
          title="Ingen statistik endnu"
          text="Spil et par runder, så dukker dine stærke og svage sider op her."
        />
      ) : (
        <div className="stats">
          <p className="mb-4 text-sm text-muted-foreground">
            {stats.soloOnly
              ? "Bygger på dine solospil blandt de seneste 30 spil."
              : "Bygger på de seneste 30 spil."}
          </p>
          <div className="stat-tiles">
            {[
              [String(stats.games), "spil"],
              [String(stats.answers), "svar"],
              [`${Math.round(stats.rate * 100)} %`, "rigtige"],
              [String(stats.bestStreak), "længste stime"],
            ].map(([value, label], index) => (
              <Card
                key={label}
                className="py-0"
                style={{ "--i": index } as React.CSSProperties}
              >
                <CardContent className="px-4 py-3 text-center">
                  <b className="block text-2xl">{value}</b>
                  <small className="text-muted-foreground">{label}</small>
                </CardContent>
              </Card>
            ))}
          </div>
          {weakest.length > 0 && (
            <div className="level-nudge mt-5">
              <p>
                Dine svageste emner:{" "}
                {weakest
                  .map((id) => categoryById(id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <Button disabled={busy} onClick={() => train(weakest)}>
                <Target />
                Træn dem · 10 spørgsmål
              </Button>
            </div>
          )}
          <h2 className="mb-3 mt-7 font-bold">Efter kategori</h2>
          <div className="grid gap-2">
            {sorted.map((category, index) => {
              const meta = categoryById(category.categoryId);
              return (
                <div
                  key={category.categoryId}
                  className="stat-row"
                  style={{ "--i": index } as React.CSSProperties}
                >
                  <span className="truncate">
                    {meta?.emoji} {meta?.name ?? "Ukendt"}
                  </span>
                  <i className="stat-bar" aria-hidden="true">
                    <b
                      style={{ width: `${Math.round(category.rate * 100)}%` }}
                    />
                  </i>
                  <small>
                    {category.correct}/{category.total}
                  </small>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Spil lidt mere, så vises kategorierne her.
              </p>
            )}
          </div>
          {stats.levels.length > 0 && (
            <>
              <h2 className="mb-3 mt-7 font-bold">Efter niveau</h2>
              <div className="flex flex-wrap gap-2">
                {stats.levels.map((level) => (
                  <Badge key={level.level} variant="secondary">
                    {DIFFICULTY_LABELS[level.level]}: {level.correct}/
                    {level.total}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
function HistoryView({
  items,
  go,
}: {
  items: GameResult[];
  go: (v: View) => void;
}) {
  return (
    <>
      <PageHead title="Spilhistorik" onBack={() => go("home")} />
      {items.length ? (
        <div className="grid gap-3">
          {items.map((r) => {
            const standings = rankPlayers(r.players);
            const winners = standings
              .filter(({ rank }) => rank === 1)
              .map(({ player }) => player);
            const names = formatNames(winners.map((player) => player.name));
            return (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Trophy className="text-primary" />
                  <div className="flex-1">
                    <b>
                      {winners.length > 1
                        ? `${names} delte førstepladsen`
                        : `${names} vandt`}
                    </b>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.playedAt).toLocaleDateString("da-DK")} ·{" "}
                      {r.questions.length} spørgsmål
                    </p>
                  </div>
                  <strong>
                    {(winners[0]?.score ?? 0).toLocaleString("da-DK")}
                  </strong>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty
          icon="🏁"
          title="Ingen spil endnu"
          text="Dit første resultat dukker op her."
        />
      )}
    </>
  );
}
function Help({
  go,
  installContext,
  canInstall,
  install,
}: {
  go: (v: View) => void;
  installContext: { mobile: boolean; ios: boolean; standalone: boolean };
  canInstall: boolean;
  install: () => Promise<void>;
}) {
  return (
    <>
      <PageHead title="Sådan spiller I" onBack={() => go("home")} />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          [
            "1",
            "Vælg holdet",
            "Tilføj spillere eller hold, kategorier og niveau.",
          ],
          [
            "2",
            "Giv videre",
            "Den aktive spiller svarer og giver enheden videre.",
          ],
          [
            "3",
            "Tænk. Vind.",
            "Et rigtigt svar giver 100 point. Ekstra point kræver et aktivt tilvalg.",
          ],
        ].map((x) => (
          <Card key={x[0]}>
            <CardContent className="p-6">
              <span className="step-number">{x[0]}</span>
              <h2 className="mt-5 text-xl font-bold">{x[1]}</h2>
              <p className="mt-2 text-muted-foreground">{x[2]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="font-bold">Point der er nemme at forstå</h2>
          <p className="mt-2 text-muted-foreground">
            Et korrekt svar giver som standard altid 100 point, uanset svartid
            og streak. Hvis I aktivt vælger Tidsbonus, kan et hurtigt svar give
            op til 50 ekstra point. Streakbonus giver 25 ekstra point for hvert
            tidligere svar i den aktuelle streak, højst 75. Risiko og Finale
            ændrer kun pointene, når I selv vælger de spilindstillinger.
          </p>
        </CardContent>
      </Card>
      {installContext.mobile && !installContext.standalone && (
        <Card className="mt-6 border-primary/40 md:hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/15 p-3 text-primary">
                <Smartphone />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">Brug KVIZY som en app</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Føj KVIZY til hjemmeskærmen. Så åbner spillet uden
                  browserbjælke og kan bruges i fuldskærm.
                </p>
                {canInstall ? (
                  <Button className="mt-4 w-full" onClick={install}>
                    <Download />
                    Installér KVIZY
                  </Button>
                ) : installContext.ios ? (
                  <ol className="mt-4 grid gap-2 text-sm">
                    <li className="flex gap-2">
                      <Share2 className="size-5 shrink-0 text-primary" />
                      Tryk på Del i Safari.
                    </li>
                    <li>Vælg “Føj til hjemmeskærm”.</li>
                    <li>Tryk “Tilføj”.</li>
                  </ol>
                ) : (
                  <p className="mt-4 text-sm">
                    Åbn browsermenuen, og vælg “Installér app” eller “Føj til
                    startskærm”.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
function SettingsView({
  value,
  onChange,
  setup,
  onRestore,
  go,
}: {
  value: AppSettings;
  onChange: (s: AppSettings) => void;
  setup: GameSetup;
  onRestore: (payload: {
    seen: SeenQuestion[];
    setup: Partial<GameSetup>;
  }) => void;
  go: (v: View) => void;
}) {
  const [backupCode, setBackupCode] = useState("");
  const [restoreCode, setRestoreCode] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const createBackup = async () => {
    setBackupBusy(true);
    setBackupStatus("");
    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          payload: {
            seen: load<SeenQuestion[]>(APP_CONFIG.seenKey, []).slice(-2_000),
            setup,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setBackupCode(result.code);
      setBackupStatus("Backupen er klar. Gem koden et sikkert sted.");
    } catch (error) {
      setBackupStatus(
        error instanceof Error ? error.message : "Backup kunne ikke oprettes.",
      );
    } finally {
      setBackupBusy(false);
    }
  };
  const restoreBackup = async () => {
    setBackupBusy(true);
    setBackupStatus("");
    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restore", code: restoreCode.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!Array.isArray(result.payload?.seen) || !result.payload?.setup)
        throw new Error("Backupen har et ukendt format.");
      onRestore(result.payload);
      setBackupStatus(
        `Gendannet: ${result.payload.seen.length} tidligere spørgsmål og jeres seneste opsætning.`,
      );
    } catch (error) {
      setBackupStatus(
        error instanceof Error ? error.message : "Backup kunne ikke gendannes.",
      );
    } finally {
      setBackupBusy(false);
    }
  };
  return (
    <>
      <PageHead title="Indstillinger" onBack={() => go("home")} />
      <Card>
        <CardContent className="divide-y p-2">
          {[
            ["Lydsignaler", "sound"],
            ["Diskret vibration", "haptics"],
            ["Reduceret bevægelse", "reducedMotion"],
            ["Høj kontrast", "highContrast"],
          ].map(([label, key]) => (
            <div
              className="flex min-h-16 items-center justify-between p-3"
              key={key}
            >
              <Label>{label}</Label>
              <Switch
                checked={value[key as keyof AppSettings] as boolean}
                onCheckedChange={(v) => onChange({ ...value, [key]: v })}
              />
            </div>
          ))}
          <div className="flex min-h-16 items-center justify-between p-3">
            <Label>Lyst tema</Label>
            <Switch
              checked={value.theme === "light"}
              onCheckedChange={(v) =>
                onChange({ ...value, theme: v ? "light" : "dark" })
              }
            />
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="font-bold">Backup af seneste spørgsmål</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gem historikken over sete spørgsmål og jeres seneste opsætning. Så
            undgår I unødige gentagelser, selv efter en geninstallation. Koden
            udløber efter ét år og indeholder ingen rapporter eller svar.
          </p>
          <Button
            className="mt-4 w-full"
            variant="outline"
            disabled={backupBusy}
            onClick={createBackup}
          >
            <CloudUpload />
            {backupBusy ? "Arbejder…" : "Opret backupkode"}
          </Button>
          {backupCode && (
            <div className="mt-4 flex gap-2">
              <Input value={backupCode} readOnly aria-label="Din backupkode" />
              <Button
                size="icon"
                variant="secondary"
                aria-label="Kopiér backupkode"
                onClick={() => void navigator.clipboard.writeText(backupCode)}
              >
                <Copy />
              </Button>
            </div>
          )}
          <div className="mt-6 border-t pt-5">
            <Label htmlFor="backup-code">Gendan med backupkode</Label>
            <Input
              id="backup-code"
              className="mt-2 uppercase"
              autoCapitalize="characters"
              autoCorrect="off"
              placeholder="KVIZY-XXXX-XXXX-XXXX"
              value={restoreCode}
              onChange={(event) => setRestoreCode(event.target.value)}
            />
            <Button
              className="mt-3 w-full"
              variant="secondary"
              disabled={backupBusy || restoreCode.trim().length < 8}
              onClick={restoreBackup}
            >
              <CloudDownload />
              Gendan backup
            </Button>
          </div>
          {backupStatus && (
            <p className="mt-4 text-sm" role="status">
              {backupStatus}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 flex justify-center" aria-label="Admin-genvej">
        <Link
          href="/admin"
          prefetch={false}
          aria-label="Åbn administration"
          className="flex size-11 items-center justify-center rounded-full text-muted-foreground/15 transition-colors hover:text-muted-foreground/35 focus-visible:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <KeyRound className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
function PageHead({
  title,
  onBack,
  kicker,
}: {
  title: string;
  onBack: () => void;
  kicker?: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <Button size="icon" variant="ghost" onClick={onBack} aria-label="Tilbage">
        <ArrowLeft />
      </Button>
      <div>
        {kicker && <small className="text-primary">{kicker}</small>}
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
      </div>
    </div>
  );
}
function Toggle({
  label,
  info,
  checked,
  on,
}: {
  label: string;
  info: string;
  checked: boolean;
  on: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Label>{label}</Label>
        <InfoHint text={info} label={`Om ${label}`} />
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={on} />
    </div>
  );
}
function InfoHint({ text, label }: { text: string; label: string }) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOtherHint = (event: Event) => {
      const openedId = (event as CustomEvent<string>).detail;
      if (openedId !== id && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    };
    window.addEventListener("kvizy-info-open", closeOtherHint);
    return () => window.removeEventListener("kvizy-info-open", closeOtherHint);
  }, [id]);
  return (
    <details
      ref={detailsRef}
      name="kvizy-info"
      className="info-hint"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          window.dispatchEvent(
            new CustomEvent<string>("kvizy-info-open", { detail: id }),
          );
        }
      }}
    >
      <summary aria-label={label}>
        <CircleHelp aria-hidden="true" />
      </summary>
      <p role="status">{text}</p>
    </details>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="text-5xl">{icon}</div>
        <h2 className="mt-4 text-xl font-bold">{title}</h2>
        <p className="mt-2 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
