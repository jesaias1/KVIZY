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
  Languages,
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
import dynamic from "next/dynamic";
import { normalizeRoomCode, type RoomBuildOptions } from "@/lib/room-protocol";
import { readHostSession, readResume } from "@/lib/room-session";
import { computeAwards } from "@/lib/awards";
import { useLang } from "@/components/lang-provider";
import { EN_SKIP_IDS } from "@/lib/i18n/en-skip";
import {
  ENGLISH_PACK_URL,
  localizeQuestion,
  localizeQuestions,
  type EnglishPack,
} from "@/lib/i18n/questions";
import type { Lang } from "@/lib/i18n";
import {
  getLang,
  locale,
  playerName,
  retitleDefaultName,
  t,
  teamName,
} from "@/lib/i18n";
import {
  ACHIEVEMENTS,
  applyGame,
  emptyAchievementState,
  sanitizeAchievementState,
  type Achievement,
  type AchievementState,
} from "@/lib/achievements";
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
  | "review"
  | "room-host"
  | "room-join";
type BestScore = { correct: number; total: number; score: number; at: string };
type RecordInfo = { previous?: BestScore; isRecord: boolean } | null;
const defaults: AppSettings = {
  theme: "dark",
  sound: true,
  haptics: true,
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  confirmAnswers: false,
  readAloud: false,
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
  players: [newPlayer(playerName(1), 0), newPlayer(playerName(2), 1)],
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
  if (names.length < 2) return names[0] ?? t("Ingen");
  return `${names.slice(0, -1).join(", ")} ${t("og")} ${names.at(-1)}`;
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
      typeof player.name === "string" ? player.name : playerName(index + 1),
      index,
    ),
    ...player,
    name:
      typeof player.name === "string"
        ? retitleDefaultName(player.name, getLang())
        : playerName(index + 1),
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
        ? [...restoredPlayers, newPlayer(playerName(2), 1)]
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
const RoomHost = dynamic(
  () => import("@/components/room").then((m) => m.RoomHost),
  { ssr: false },
);
const RoomPlayer = dynamic(
  () => import("@/components/room").then((m) => m.RoomPlayer),
  { ssr: false },
);
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
  // Læser sproget, så hele spillet tegnes igen, når det skiftes.
  const { lang, setLang } = useLang();
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
  const englishPack = useRef<EnglishPack | null>(null);
  /** Henter de engelske spørgsmål første gang, engelsk bruges. */
  const ensureEnglish = async () => {
    if (getLang() !== "en") return null;
    if (englishPack.current) return englishPack.current;
    try {
      const response = await fetch(
        `${ENGLISH_PACK_URL}?v=${APP_CONFIG.questionBankVersion}`,
      );
      if (response.ok)
        englishPack.current = (await response.json()) as EnglishPack;
    } catch {
      // Uden forbindelse vises spørgsmålene på dansk i stedet.
    }
    return englishPack.current;
  };
  const finishing = useRef(false);
  const [roomCode, setRoomCode] = useState("");
  const [achievements, setAchievements] = useState<AchievementState>(
    emptyAchievementState,
  );
  const [freshAchievements, setFreshAchievements] = useState<Achievement[]>([]);
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
      setAchievements(
        sanitizeAchievementState(
          load<unknown>(APP_CONFIG.achievementsKey, null),
        ),
      );
      setDaily(load<DailyProgress>(APP_CONFIG.dailyKey, emptyDailyProgress()));
      setTodayKey(localDateKey());
      setSetup(
        restoreSetup(
          load<Partial<GameSetup> | null>(APP_CONFIG.setupKey, null),
        ),
      );
      const s = load(APP_CONFIG.settingsKey, defaults);
      setSettings({ ...defaults, ...s });
      setTheme(s.theme);
      // Et delt link som /?rum=ABCD åbner direkte i «Join rum».
      try {
        const params = new URLSearchParams(window.location.search);
        const code = normalizeRoomCode(params.get("rum") ?? "");
        if (code) {
          setRoomCode(code);
          setView("room-join");
          window.history.replaceState(null, "", window.location.pathname);
        } else if (readHostSession()) {
          // En vært, der genindlæste siden, går tilbage til sit rum.
          setView("room-host");
        } else if (readResume()) {
          // En telefon, der blev genindlæst midt i et rum, går tilbage til det.
          setView("room-join");
        }
      } catch {
        // Ingen adresselinje at læse.
      }
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
          throw new Error(t("Tom spørgsmålsbank"));
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
      "large-text",
      Boolean(settings.largeText),
    );
    document.documentElement.classList.toggle(
      "reduce-motion",
      settings.reducedMotion,
    );
  }, [settings, hydrated, setTheme]);
  useEffect(() => {
    // Skærmen må ikke gå i hvile midt i et spørgsmål.
    if (view !== "play" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [view]);
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
  const switchLang = (next: Lang) => setLang(next);
  useEffect(() => {
    // Standardnavne som «Spiller 1» skifter sprog med; selvvalgte navne bevares.
    if (!hydrated) return;
    const id = window.setTimeout(
      () =>
        setSetup((current) => ({
          ...current,
          players: current.players.map((player) => ({
            ...player,
            name: retitleDefaultName(player.name, lang),
          })),
        })),
      0,
    );
    return () => window.clearTimeout(id);
  }, [lang, hydrated]);
  const go = (v: View) => {
    tone("tap", settings.sound);
    if (v === "setup") {
      setSetup((current) => ({
        ...current,
        mode: "classic",
        players:
          current.players.length < 2
            ? [...current.players, newPlayer(playerName(2), 1)]
            : current.players,
      }));
    }
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const start = async (
    same?: GameSetup,
    options?: { daily?: string; practice?: Question[] },
  ) => {
    if (startBusy.current) return;
    startBusy.current = true;
    try {
      setStartError(null);
      const s = same ?? setup;
      const english = await ensureEnglish();
      const bank = await loadQuestionBank(s.categoryIds);
      // Spørgsmål om det danske sprog udelades på engelsk og i Dagens quiz.
      const availableQuestions =
        english || options?.daily
          ? bank.filter((question) => !EN_SKIP_IDS.has(question.id))
          : bank;
      if (availableQuestions.length === 0) {
        setStartError(
          t(
            "Spørgsmålene kunne ikke hentes. Tjek forbindelsen, eller prøv den senest gemte kategoriopsætning.",
          ),
        );
        setView("setup");
        return;
      }
      const selectedPlayers =
        s.mode === "solo" || s.mode === "blitz" ? [s.players[0]] : s.players;
      const requestedCount =
        s.mode === "quick" ? 10 : s.mode === "blitz" ? 30 : s.questionCount;
      const normalized = {
        ...s,
        questionCount: options?.practice
          ? options.practice.length
          : closestFairQuestionCount(requestedCount, selectedPlayers.length),
        players: selectedPlayers,
      };
      const seenHistory = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
      // Dagens quiz er ens for alle: fast seed og ingen personlig historik.
      const picked = options?.practice
        ? options.practice
        : options?.daily
          ? selectQuestions(
              availableQuestions,
              normalized,
              [],
              mulberry32(dailySeed(options.daily)),
            )
          : selectQuestions(availableQuestions, normalized, seenHistory);
      const questions = options?.practice
        ? picked
        : localizeQuestions(picked, english);
      if (questions.length < normalized.questionCount) {
        setStartError(
          questions.length === 0
            ? t(
                "Der er ingen spørgsmål i de valgte kategorier. Vælg flere kategorier.",
              )
            : t(
                "Der er kun {length} forskellige spørgsmål til denne opsætning. Vælg flere kategorier eller et kortere spil.",
                { length: questions.length },
              ),
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
        practice: Boolean(options?.practice),
      };
      finishing.current = false;
      setFreshAchievements([]);
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
            picked,
          ),
        ),
      );
      trackEvent("game_started", normalized.categoryIds);
      go("play");
    } catch {
      setStartError(
        t("Spillet kunne ikke startes. Opsætningen er bevaret – prøv igen."),
      );
      setView("setup");
    } finally {
      startBusy.current = false;
    }
  };
  const finish = (g: Game) => {
    if (finishing.current) return;
    finishing.current = true;
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
    let dailyStreak = 0;
    if (g.dailyKey) {
      const updated = recordDaily(daily ?? emptyDailyProgress(), g.dailyKey, {
        correct: leader.correct,
        total: g.questions.length,
        score: leader.score,
      });
      setDaily(updated);
      safeSet(APP_CONFIG.dailyKey, JSON.stringify(updated));
      dailyStreak = activeDailyStreak(updated, g.dailyKey);
      setRecord(null);
    } else if (soloRound && !g.practice) {
      const key =
        g.setup.mode === "blitz" ? "blitz" : `solo-${g.questions.length}`;
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
            total:
              g.setup.mode === "blitz" ? g.answers.length : g.questions.length,
            score: leader.score,
            at: r.playedAt,
          },
        };
        setBests(updated);
        safeSet(APP_CONFIG.bestKey, JSON.stringify(updated));
      }
      setRecord({ previous, isRecord });
    } else setRecord(null);
    const unlocked = applyGame(achievements, g, { dailyStreak });
    setAchievements(unlocked.state);
    safeSet(APP_CONFIG.achievementsKey, JSON.stringify(unlocked.state));
    setFreshAchievements(unlocked.newlyUnlocked);
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
        players: [setup.players[0] ?? newPlayer(playerName(1), 0)],
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
  const practiceMissed = () => {
    if (!game) return;
    const missed = game.questions.filter(
      (question) =>
        game.answers.find((a) => a.questionId === question.id)?.correct !==
        true,
    );
    if (missed.length === 0) return;
    void start(
      {
        ...game.setup,
        mode: "solo",
        players: [game.setup.players[0]],
        timer: false,
        timeBonus: false,
        lifelines: false,
        finale: false,
      },
      { practice: missed },
    );
  };
  const playLevel = (level: number) => {
    if (!game) return;
    setSetup((current) => ({ ...current, difficulty: level }));
    void start({ ...game.setup, difficulty: level });
  };
  const buildRoomQuestions = async ({
    count,
    categoryIds,
    difficulty,
  }: RoomBuildOptions) => {
    // Rum bruger de seneste kategorier og det senest valgte niveau. Rækkefølge-
    // spørgsmål udelades, fordi de ikke kan besvares med ét tryk på en telefon.
    const english = await ensureEnglish();
    const all = await loadQuestionBank(categoryIds);
    const bank = english
      ? all.filter((question) => !EN_SKIP_IDS.has(question.id))
      : all;
    if (bank.length === 0) return [];
    const seenHistory = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
    const picked = selectQuestions(
      bank,
      {
        ...setup,
        mode: "classic",
        players: [setup.players[0] ?? newPlayer(t("Vært"), 0)],
        questionCount: Math.min(90, count + 12),
        categoryIds,
        difficulty,
        difficultyMode: "mixed",
        finale: false,
        lifelines: false,
        timer: false,
        timeBonus: false,
      },
      seenHistory,
    )
      .filter((question) => question.type !== "ordering")
      .slice(0, count);
    safeSet(
      APP_CONFIG.seenKey,
      JSON.stringify(
        reserveSeenQuestions(
          seenHistory,
          picked.map((question) => question.id),
          new Date().toISOString(),
          picked,
        ),
      ),
    );
    return localizeQuestions(picked, english);
  };
  const playBlitz = () => {
    // Lynrunde: 60 sekunder, så mange rigtige som muligt.
    void start({
      ...setup,
      mode: "blitz",
      players: [setup.players[0] ?? newPlayer(playerName(1), 0)],
      questionCount: 30,
      difficulty: 2,
      difficultyMode: "mixed",
      categoryIds: setup.categoryIds.length
        ? setup.categoryIds
        : DEFAULT_CATEGORIES.map((category) => category.id),
      timer: false,
      timeBonus: false,
      minusPoints: false,
      finale: false,
      lifelines: false,
    });
  };
  const quick = (categoryIds?: string[]) => {
    // Ét tryk fra forsiden: ti blandede spørgsmål med de senest valgte
    // kategorier og det senest valgte niveau.
    void start({
      ...setup,
      mode: "quick",
      players: [setup.players[0] ?? newPlayer(playerName(1), 0)],
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
      getLang() === "en"
        ? questionBank.filter((question) => !EN_SKIP_IDS.has(question.id))
        : questionBank,
      game.questions,
      game.setup,
      seen,
    );
    if (!replacement) return false;
    const questions = [...game.questions];
    questions[game.index] = {
      ...(getLang() === "en"
        ? localizeQuestion(replacement, englishPack.current)
        : replacement),
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
        playBlitz={playBlitz}
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
        confirmAnswers={Boolean(settings.confirmAnswers)}
        readAloud={Boolean(settings.readAloud)}
        answer={answer}
        next={nextQuestion}
        report={reportQuestion}
        skip={skipSeenQuestion}
        timeUp={() => finish(game)}
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
        practiceMissed={practiceMissed}
        newAchievements={freshAchievements}
        record={record}
        streak={daily ? activeDailyStreak(daily, game.dailyKey ?? todayKey) : 0}
        busy={questionBankLoading}
      />
    ) : view === "room-host" ? (
      <RoomHost
        buildQuestions={buildRoomQuestions}
        sound={settings.sound}
        onExit={() => go("home")}
      />
    ) : view === "room-join" ? (
      <RoomPlayer
        initialCode={roomCode}
        haptics={settings.haptics}
        onExit={() => {
          setRoomCode("");
          go("home");
        }}
      />
    ) : view === "history" ? (
      <HistoryView items={history} go={go} />
    ) : view === "stats" ? (
      <StatsView
        history={history}
        achievements={achievements}
        go={go}
        busy={questionBankLoading}
        train={(ids) => quick(ids)}
      />
    ) : view === "settings" ? (
      <SettingsView
        value={settings}
        lang={lang}
        onLang={switchLang}
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
        lang={lang}
        onLang={switchLang}
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

/** Knap til at skifte mellem dansk og engelsk. */
function LangSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  const next: Lang = lang === "da" ? "en" : "da";
  return (
    <Button
      variant="ghost"
      size="sm"
      className="lang-switch"
      lang={next}
      aria-label={next === "en" ? "Switch to English" : "Skift til dansk"}
      onClick={() => onChange(next)}
    >
      <Languages aria-hidden="true" className="lang-icon" />
      <span className="lang-full">{next === "en" ? "English" : "Dansk"}</span>
      <span className="lang-short" aria-hidden="true">
        {next === "en" ? "EN" : "DA"}
      </span>
    </Button>
  );
}

function TopBar({
  view,
  settings,
  setSettings,
  go,
  lang,
  onLang,
}: {
  view: View;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  go: (v: View) => void;
  lang: Lang;
  onLang: (lang: Lang) => void;
}) {
  return (
    <header
      className={`app-topbar ${
        view === "home"
          ? "floating absolute inset-x-0 top-0 z-40"
          : "z-40 border-b sm:sticky sm:top-0 border-border/60 bg-background/90 backdrop-blur"
      }`}
    >
      <div
        className={`mx-auto flex h-14 max-w-5xl sm:h-20 items-center px-4 sm:px-6 ${
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
          <LangSwitch lang={lang} onChange={onLang} />
          <Button
            size="icon"
            variant="ghost"
            aria-label={settings.sound ? t("Slå lyd fra") : t("Slå lyd til")}
            onClick={() => setSettings({ ...settings, sound: !settings.sound })}
          >
            {settings.sound ? <Sound2 /> : <SoundOff />}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" aria-label={t("Åbn menu")}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-border/25">
              <SheetHeader>
                <SheetTitle>{t("Menu")}</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 grid gap-2">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("stats")}
                  >
                    <BarChart3 />
                    {t("Statistik")}
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("history")}
                  >
                    <History />
                    {t("Historik")}
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("help")}
                  >
                    <BookOpen />
                    {t("Sådan spiller I")}
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => go("settings")}
                  >
                    <Settings />
                    {t("Indstillinger")}
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
const SHOWCASE = [
  {
    cat: "🚀 Rummet",
    level: "Almindelig",
    q: "Hvilken planet har solsystemets korteste døgn?",
    options: ["Saturn", "Jupiter", "Mars", "Neptun"],
    correct: 1,
  },
  {
    cat: "🏰 Danmark",
    level: "Let",
    q: "Hvad hedder Danmarks længste å?",
    options: ["Skjern Å", "Storå", "Gudenåen", "Odense Å"],
    correct: 2,
  },
  {
    cat: "🐾 Dyr",
    level: "Svær",
    q: "Hvor mange hjerter har en blæksprutte?",
    options: ["2", "3", "4", "8"],
    correct: 1,
  },
  {
    cat: "🎨 Kunst",
    level: "Almindelig",
    q: "Hvem malede «Skriget»?",
    options: [
      "Gustav Klimt",
      "Edvard Munch",
      "Egon Schiele",
      "Vincent van Gogh",
    ],
    correct: 1,
  },
  {
    cat: "🎬 Danske film",
    level: "Almindelig",
    q: "Hvem instruerede både «Festen» og «Jagten»?",
    options: [
      "Lars von Trier",
      "Susanne Bier",
      "Thomas Vinterberg",
      "Nicolas Winding Refn",
    ],
    correct: 2,
  },
] as const;

/** Et lille, selvspillende spørgsmål, der viser spilfølelsen på forsiden. */
function QuizShowcase({ reducedMotion }: { reducedMotion: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % SHOWCASE.length),
      5800,
    );
    return () => window.clearInterval(id);
  }, [reducedMotion]);
  const item = SHOWCASE[index];
  return (
    <div className="showcase" aria-hidden="true">
      <span className="float-chip a">
        <Flame /> {t("5 i træk")}
      </span>
      <span className="float-chip b">
        <Trophy /> {t("Ny rekord")}
      </span>
      <div className="showcase-back" />
      <div key={index} className="showcase-card">
        <div className="showcase-top">
          <span className="pill">{t(item.cat)}</span>
          <span className="pill muted">{t(item.level)}</span>
          <b className="showcase-score">+100</b>
        </div>
        <p className="showcase-q">{t(item.q)}</p>
        <div className="showcase-answers">
          {item.options.map((text, i) => (
            <div
              key={text}
              className={`showcase-answer ${i === item.correct ? "right" : "other"}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <span>{"ABCD"[i]}</span>
              <b>{t(text)}</b>
              {i === item.correct && <Check />}
            </div>
          ))}
        </div>
        <div className="showcase-dots">
          {SHOWCASE.map((entry, i) => (
            <i key={entry.q} className={i === index ? "on" : ""} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** To rækker kategorier, der glider forbi i hver sin retning. */
function CategoryTicker() {
  const half = Math.ceil(DEFAULT_CATEGORIES.length / 2);
  const rows = [
    DEFAULT_CATEGORIES.slice(0, half),
    DEFAULT_CATEGORIES.slice(half),
  ];
  return (
    <div className="ticker" aria-hidden="true">
      {rows.map((row, r) => (
        <div key={r} className={`ticker-row ${r ? "rev" : ""}`}>
          <div className="ticker-track">
            {[...row, ...row].map((category, i) => (
              <span key={`${category.id}-${i}`}>
                {category.emoji} {category.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyTile({
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
    <button
      type="button"
      className={`action-card tile ${done ? "done" : ""}`}
      disabled={busy || Boolean(done)}
      onClick={onClick}
    >
      <span className="icon">{done ? <Check /> : <CalendarCheck />}</span>
      <span className="text">
        <b>{t("Dagens quiz")}</b>
        <small>
          {done
            ? t("Klaret · {correct}/{total}", {
                correct: done.correct,
                total: done.total,
              })
            : t("Samme ti til alle")}
        </small>
      </span>
      {streak > 0 && (
        <span
          className="daily-streak"
          aria-label={t("{streak} dage i træk", { streak })}
        >
          <Flame aria-hidden="true" />
          {streak}
        </span>
      )}
    </button>
  );
}

function Home({
  game,
  history,
  reducedMotion,
  go,
  quick,
  playBlitz,
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
  playBlitz: () => void;
  playDaily: () => void;
  daily: DailyProgress | null;
  todayKey: string;
  busy: boolean;
  best?: BestScore;
}) {
  const resume = game && !game.completedAt ? game : null;
  return (
    <div className="home-shell">
      <section className="home-hero">
        <div className="home-copy">
          <div className="home-brand">
            <BrandLockup />
          </div>
          <p className="home-eyebrow">
            <i className="live-dot" aria-hidden="true" />{" "}
            {t("Dansk quiz til venner, fest og pubquiz")}
          </p>
          <h1 className="home-title">
            {t("Quiz-aftenen starter")} <span>{t("her.")}</span>
          </h1>
          <p className="home-sub">
            {t(
              "Giv telefonen rundt og find ud af, hvem der ved mest. Ingen login, ingen download.",
            )}
          </p>
          <div className="action-stack">
            {resume && (
              <button
                type="button"
                className="action-card resume"
                onClick={() => go("play")}
              >
                <span className="icon">
                  <RefreshCw />
                </span>
                <span className="text">
                  <b>{t("Fortsæt dit spil")}</b>
                  <small>
                    {t("Spørgsmål {n} af {total}", {
                      n: resume.index + 1,
                      total: resume.questions.length,
                    })}
                  </small>
                  <i
                    className="resume-bar"
                    style={
                      {
                        "--p": (resume.index + 1) / resume.questions.length,
                      } as React.CSSProperties
                    }
                  />
                </span>
                <ArrowRight />
              </button>
            )}
            <button
              type="button"
              className="action-card primary"
              onClick={() => go("setup")}
            >
              <span className="icon">
                <Gamepad2 />
              </span>
              <span className="text">
                <b>{t("Start nyt spil")}</b>
                <small>{t("Venner, hold eller solo")}</small>
              </span>
              <ArrowRight />
            </button>
            <div className="action-grid">
              {daily && todayKey ? (
                <DailyTile
                  daily={daily}
                  todayKey={todayKey}
                  busy={busy}
                  onClick={playDaily}
                />
              ) : (
                <span
                  className="action-card tile placeholder"
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                className="action-card tile"
                disabled={busy}
                onClick={() => quick()}
              >
                <span className="icon">
                  <Zap />
                </span>
                <span className="text">
                  <b>{busy ? t("Finder…") : t("Hurtigt spil")}</b>
                  <small>{t("10 spørgsmål · ca. 3 min")}</small>
                </span>
              </button>
            </div>
          </div>
          <div className="home-links">
            <button type="button" disabled={busy} onClick={playBlitz}>
              <Zap /> {t("Lynrunde")}
            </button>
            <button type="button" onClick={() => go("room-host")}>
              <Smartphone /> {t("Opret rum")}
            </button>
            <button type="button" onClick={() => go("room-join")}>
              <KeyRound /> {t("Join rum")}
            </button>
            <button type="button" onClick={() => go("help")}>
              <BookOpen /> {t("Sådan spiller I")}
            </button>
            <button type="button" onClick={() => go("stats")}>
              <BarChart3 /> {t("Statistik")}
            </button>
          </div>
          {(best || history.length > 0) && (
            <p className="home-stats">
              {best && (
                <span>
                  <Trophy aria-hidden="true" />
                  {t("Rekord: {correct} af {total}", {
                    correct: best.correct,
                    total: best.total,
                  })}
                </span>
              )}
              {history.length > 0 && (
                <span>
                  <History aria-hidden="true" />
                  {t("{n} spil spillet", { n: history.length })}
                </span>
              )}
            </p>
          )}
        </div>
        <QuizShowcase reducedMotion={reducedMotion} />
      </section>
      <CategoryTicker />
      <dl className="home-facts">
        <div>
          <dt>{t("2.000+")}</dt>
          <dd>{t("spørgsmål")}</dd>
        </div>
        <div>
          <dt>65</dt>
          <dd>{t("kategorier")}</dd>
        </div>
        <div>
          <dt>1–12</dt>
          <dd>{t("spillere")}</dd>
        </div>
        <div>
          <dt>{t("0 kr.")}</dt>
          <dd>{t("og ingen login")}</dd>
        </div>
      </dl>
      <p className="home-legal">
        <a href={getLang() === "en" ? "/privacy" : "/privatliv"}>
          {t("Privatliv og data")}
        </a>
      </p>
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
    c.name
      .toLocaleLowerCase(locale())
      .includes(search.toLocaleLowerCase(locale())),
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
          {c.niche && <small>{t("Nichekategori · vælg selv")}</small>}
          {selected && (
            <i className="category-check" aria-hidden="true">
              <Check />
            </i>
          )}
        </button>
        <button
          className={`fav ${fav ? "active" : ""}`}
          aria-label={t("Favorit: {name}", { name: c.name })}
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
            ? teamName(setup.players.length + 1)
            : playerName(setup.players.length + 1),
          setup.players.length,
        ),
      ],
    });
  return (
    <>
      <PageHead
        title={t("Opret spil")}
        onBack={() => (step ? setStep(step - 1) : go("home"))}
        kicker={t("Trin {n} af 3", { n: step + 1 })}
      />
      {startError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm"
        >
          <b>{t("Kunne ikke starte quizzen")}</b>
          <p className="mt-1 text-muted-foreground">{startError}</p>
        </div>
      )}
      <Progress
        value={((step + 1) / 3) * 100}
        className="mb-7"
        aria-label={t("Trin {n} af 3", { n: step + 1 })}
      />
      {step === 0 && (
        <div className="step-enter space-y-8">
          <section>
            <Label className="mb-3 block text-base">{t("Spilleform")}</Label>
            <div
              className="mode-grid"
              role="radiogroup"
              aria-label={t("Spilleform")}
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
                        ? [
                            /^(?:Spiller|Player) (\d+)$/,
                            getLang() === "en" ? "Team" : "Hold",
                          ]
                        : [
                            /^(?:Hold|Team) (\d+)$/,
                            getLang() === "en" ? "Player" : "Spiller",
                          ];
                    const named = (
                      setup.players.length < 2 && !solo
                        ? [...setup.players, newPlayer(playerName(2), 1)]
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
                  <b>{t(m.title)}</b>
                  <small>{t(m.text)}</small>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-base">
                {setup.mode === "teams" ? t("Hold") : t("Spillere")}
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSetup({ ...setup, players: shuffle(setup.players) })
                }
              >
                <Shuffle />
                {t("Bland rækkefølge")}
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
                          aria-label={t("Vælg dyr for {name}", {
                            name: p.name,
                          })}
                        >
                          {p.avatar}
                        </button>
                      </SheetTrigger>
                      <SheetContent
                        side="bottom"
                        className="pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                      >
                        <SheetHeader>
                          <SheetTitle>
                            {t("Vælg dyr til {name}", { name: p.name })}
                          </SheetTitle>
                        </SheetHeader>
                        <div className="grid grid-cols-6 gap-2 px-4 pb-5 sm:grid-cols-8 md:grid-cols-12">
                          {ANIMAL_AVATARS.map((avatar) => (
                            <SheetClose asChild key={avatar}>
                              <button
                                className={`grid aspect-square min-h-11 min-w-11 place-items-center rounded-xl text-2xl transition hover:bg-muted ${p.avatar === avatar ? "bg-primary/15 ring-2 ring-primary" : "bg-secondary"}`}
                                aria-label={t("Vælg {avatar}", { avatar })}
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
                      aria-label={t("Navn på {v0}", { v0: i + 1 })}
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
                        aria-label={t("Fjern")}
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
                  {setup.mode === "teams"
                    ? t("+ Tilføj hold")
                    : t("+ Tilføj spiller")}
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
              {t("Vælg alle")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSetup({ ...setup, categoryIds: [] })}
            >
              {t("Fravælg alle")}
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
              {t("Tilfældig blanding")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setSetup({ ...setup, categoryIds: DANISH_CATEGORY_IDS })
              }
            >
              {t("Kun dansk")}
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={t("Søg i kategorier")}
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
                        {all ? t("Fravælg") : t("Vælg alle")}
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
            {t("{n} kategorier valgt · favoritter optræder oftere", {
              n: setup.categoryIds.length,
            })}
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="step-enter grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("Antal spørgsmål")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-end justify-between gap-4">
                <b className="text-4xl">{displayedQuestionCount}</b>
                <span className="text-right text-sm text-muted-foreground">
                  {setup.mode === "teams"
                    ? t("{n} spørgsmål pr. hold", {
                        n: displayedQuestionCount / setup.players.length,
                      })
                    : t("{n} spørgsmål pr. spiller", {
                        n: displayedQuestionCount / setup.players.length,
                      })}
                </span>
              </div>
              <Slider
                aria-label={t("Antal spørgsmål")}
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
                <CardTitle>{t("Sværhedsgrad")}</CardTitle>
                <InfoHint
                  label={t("Om sværhedsforløb")}
                  text={t(
                    "Fast holder samme niveau. Blandet varierer mellem niveauet lige under, det valgte niveau og niveauet lige over. Stigende starter lidt lettere og bliver gradvist sværere.",
                  )}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="level-picker"
                role="radiogroup"
                aria-label={t("Sværhedsgrad")}
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
                    <b>{t(DIFFICULTY_LABELS[level])}</b>
                  </button>
                ))}
              </div>
              <p className="level-hint">{t(LEVEL_HINTS[setup.difficulty])}</p>
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
                    {t(option.label)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t("Tilføjelser")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 pt-0 sm:grid-cols-2 lg:grid-cols-3">
              <Toggle
                label={t("Vis 30 sek. timer")}
                info={t(
                  "Viser en nedtælling. Tiden giver ikke ekstra point, medmindre Tidsbonus også slås til.",
                )}
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
                label={t("Tidsbonus")}
                info={t(
                  "Giver op til 50 ekstra point for et hurtigt korrekt svar og slår automatisk timeren til.",
                )}
                checked={setup.timeBonus}
                on={(v) =>
                  setSetup({ ...setup, timeBonus: v, timer: v || setup.timer })
                }
              />
              <Toggle
                label={t("Streakbonus")}
                info={t(
                  "Giver 25 ekstra point pr. svar i den aktuelle sejrsrække, op til 75 bonuspoint.",
                )}
                checked={setup.streakBonus}
                on={(v) => setSetup({ ...setup, streakBonus: v })}
              />
              <Toggle
                label={t("Minuspoint")}
                info={t(
                  "Forkerte svar kan koste point. Risiko med 2× eller 3× kan stadig koste point efter sine egne regler.",
                )}
                checked={setup.minusPoints}
                on={(v) => setSetup({ ...setup, minusPoints: v })}
              />
              <Toggle
                label={t("Finale Dobbelt Point")}
                info={t(
                  "Hver spiller eller hvert hold får dobbelt point på sit sidste spørgsmål.",
                )}
                checked={setup.finale}
                on={(v) => setSetup({ ...setup, finale: v })}
              />
              <Toggle
                label={t("3 livslinjer")}
                info={t(
                  "Hver spiller eller hvert hold får tre 50/50-livslinjer, som fjerner to forkerte svar.",
                )}
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
          {t("Tilbage")}
        </Button>
        {step < 2 ? (
          <Button
            className="ml-auto"
            disabled={step === 1 && !setup.categoryIds.length}
            onClick={() => setStep(step + 1)}
          >
            {t("Fortsæt")}
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
            {questionsReady ? t("Start quizzen") : t("Gør spørgsmål klar…")}
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
      `${Math.round(n).toLocaleString(locale())}${suffix}`;
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
      {Math.round(from ?? value).toLocaleString(locale())}
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
  return t(lines[hash % lines.length]);
}
function Play({
  game,
  sound,
  confirmAnswers,
  readAloud,
  answer,
  next,
  setRisk,
  report,
  skip,
  timeUp,
  useLifeline,
}: {
  game: Game;
  sound: boolean;
  confirmAnswers: boolean;
  readAloud: boolean;
  answer: (id: string, ms: number) => void;
  next: () => void;
  skip: () => boolean;
  timeUp: () => void;
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
    [pendingId, setPendingId] = useState<string | null>(null),
    [revealed, setRevealed] = useState(!readAloud),
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
  const blitz = game.setup.mode === "blitz";
  const [blitzLeft, setBlitzLeft] = useState<number>(APP_CONFIG.blitzSeconds);
  const timeUpRef = useRef(timeUp);
  const nextRef = useRef(next);
  useEffect(() => {
    timeUpRef.current = timeUp;
    nextRef.current = next;
  });
  useEffect(() => {
    if (!blitz) return;
    const startedAt = Date.parse(game.startedAt);
    const tick = () => {
      const left = Math.max(
        0,
        APP_CONFIG.blitzSeconds - (Date.now() - startedAt) / 1000,
      );
      setBlitzLeft(Math.ceil(left));
      if (left <= 0) {
        window.clearInterval(interval);
        timeUpRef.current();
      }
    };
    const interval = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(interval);
  }, [blitz, game.startedAt]);
  useEffect(() => {
    // I lynrunden går det videre af sig selv efter et kort blik på svaret.
    if (!blitz || !answered) return;
    const id = window.setTimeout(() => nextRef.current(), 650);
    return () => window.clearTimeout(id);
  }, [blitz, answered]);
  useEffect(() => {
    if (!answered) return;
    // Fokus på Videre gør, at Enter og mellemrum fører direkte videre, og på
    // små skærme rulles forklaringen ind i billedet.
    nextButton.current?.focus({ preventScroll: true });
    feedback.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [answered]);
  // Læs-op-tilstand: svarene vises først, når værten har læst spørgsmålet.
  const hideOptions = readAloud && !revealed && !given;
  const reveal = () => {
    started.current = Date.now();
    setSecondsLeft(30);
    setRevealed(true);
  };
  // Med «Bekræft svar» slået til vælger første tryk, og andet tryk låser.
  const choose = (id: string) => {
    if (confirmAnswers && pendingId !== id) {
      setPendingId(id);
      return;
    }
    answer(id, Date.now() - started.current);
  };
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
      if (hideOptions) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          reveal();
        }
        return;
      }
      if (q.type === "ordering") return;
      const key = event.key.toLowerCase();
      const index =
        "1234".indexOf(key) >= 0 ? "1234".indexOf(key) : "abcd".indexOf(key);
      const option = key.length === 1 ? visibleOptions[index] : undefined;
      if (!option) {
        if (event.key === "Enter" && confirmAnswers && pendingId) {
          event.preventDefault();
          answer(pendingId, Date.now() - started.current);
        }
        return;
      }
      event.preventDefault();
      choose(option.id);
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
  const modeTitle = t(
    modes.find((mode) => mode.id === game.setup.mode)?.title ?? "Quiz",
  );
  return (
    <div className="quiz-screen mx-auto max-w-3xl lg:max-w-4xl">
      <div className="quiz-heading mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <small className="text-muted-foreground">
            {blitz
              ? t("Lynrunde")
              : solo
                ? modeTitle
                : t("Spørgsmål {n} af {total}", { n: game.index + 1, total })}
          </small>
          <h1 className="truncate text-lg font-bold">
            {blitz
              ? t("{correct} rigtige", { correct: p.correct })
              : solo
                ? t("Spørgsmål {n} af {total}", { n: game.index + 1, total })
                : t("{avatar} {name}s tur", { avatar: p.avatar, name: p.name })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {p.streak >= 2 && (
            <span
              key={p.streak}
              className="streak-chip"
              role="status"
              aria-label={t("{streak} rigtige i træk", { streak: p.streak })}
            >
              <Flame aria-hidden="true" />
              {t("{n} i træk", { n: p.streak })}
            </span>
          )}
          <div
            className={`score-pill active ${given ? (given.points > 0 ? "gain" : given.points < 0 ? "loss" : "") : ""}`}
            role="status"
            aria-label={t("{name}s point", { name: p.name })}
          >
            <span>{p.avatar}</span>
            <b>
              <AnimatedNumber value={p.score} from={scoreAtMount} />
            </b>
            {given && given.points !== 0 && (
              <i className="points-pop" aria-hidden="true">
                {given.points > 0 ? "+" : ""}
                {given.points.toLocaleString(locale())}
              </i>
            )}
          </div>
        </div>
      </div>
      {blitz ? null : total <= 20 ? (
        <div
          className="progress-dots"
          role="progressbar"
          aria-label={t("Fremdrift")}
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
          aria-label={t("Fremdrift")}
        />
      )}
      {(game.setup.timer || game.setup.timeBonus) && !given && (
        <div className="mt-4" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Clock3 className="size-4" />
              {secondsLeft > 0
                ? game.setup.timeBonus
                  ? t("Tid til bonus")
                  : t("Tid tilbage")
                : t("Tiden er gået – svar stadig")}
            </span>
            <b className={secondsLeft <= 5 ? "timer-urgent" : ""}>
              {secondsLeft} sek.
            </b>
          </div>
          <Progress
            className="timer-progress"
            value={(secondsLeft / 30) * 100}
            aria-label={t("Resterende svartid")}
          />
        </div>
      )}
      {blitz && (
        <div
          className={`blitz-bar ${blitzLeft <= 10 ? "hurry" : ""}`}
          role="timer"
          aria-label={t("{blitzLeft} sekunder tilbage", { blitzLeft })}
        >
          <i
            style={{
              width: `${(blitzLeft / APP_CONFIG.blitzSeconds) * 100}%`,
            }}
          />
          <b>{blitzLeft}</b>
        </div>
      )}
      {game.setup.mode === "risk" && !given && (
        <div className="my-5 flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("Vælg risiko:")}
          </span>
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
                ? t("Fjern to forkerte svar")
                : lifelinesLeft < 1
                  ? t("Ingen livslinjer tilbage")
                  : t("50/50 kan ikke bruges på denne spørgsmålstype")
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
                ? t("🎁 Mystery Mix")
                : `${cat?.emoji} ${cat?.name}`}
            </Badge>
            <Badge variant="secondary">
              {DIFFICULTY_LABELS[q.difficulty]
                ? t(DIFFICULTY_LABELS[q.difficulty])
                : t("Niveau {n}", { n: q.difficulty })}
            </Badge>
            {typeLabels[q.type] && (
              <Badge className="quiz-type-badge" variant="outline">
                {t(typeLabels[q.type] ?? "")}
              </Badge>
            )}
            {(q.finale || q.type === "finale") && (
              <Badge>{t("Finale · dobbelt point")}</Badge>
            )}
            {!given && !blitz && (
              <Button
                aria-label={t("Byt et spørgsmål, I allerede har set")}
                className="ml-auto h-8 min-h-8 gap-1 px-2 text-xs text-muted-foreground opacity-85 hover:opacity-100"
                size="sm"
                title={t("Behold turen og få et nyt spørgsmål")}
                variant="ghost"
                onClick={() => setSkipUnavailable(!skip())}
              >
                <RefreshCw className="size-3" />
                {t("Set før? Byt")}
              </Button>
            )}
          </div>
          {skipUnavailable && (
            <small className="text-right text-muted-foreground" role="status">
              {t("Der er ikke et andet ubrugt spørgsmål i den valgte pulje.")}
            </small>
          )}
          <CardTitle className="question-title pt-4 text-2xl leading-tight sm:text-[2rem]">
            <QuizText>{q.prompt}</QuizText>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {hideOptions && (
            <Button className="h-16 text-lg" onClick={reveal}>
              {t("Vis svarmuligheder")}
            </Button>
          )}
          {!hideOptions &&
            visibleOptions.map((o, i) => {
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
                    ? pendingId === o.id
                      ? "picked"
                      : ""
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
                      : choose(o.id)
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
          {confirmAnswers &&
            !hideOptions &&
            q.type !== "ordering" &&
            !given && (
              <Button
                className="mt-1"
                disabled={!pendingId}
                onClick={() =>
                  pendingId && answer(pendingId, Date.now() - started.current)
                }
              >
                {pendingId ? t("Lås svar") : t("Vælg et svar")}
              </Button>
            )}
          {q.type === "ordering" && !given && !hideOptions && (
            <div className="mt-2 flex gap-2">
              <Button
                className="flex-1"
                disabled={order.length !== q.options.length}
                onClick={() =>
                  answer(order.join("|"), Date.now() - started.current)
                }
              >
                {t("Lås rækkefølgen")}
              </Button>
              <Button variant="ghost" onClick={() => setOrder([])}>
                {t("Nulstil")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {q.type !== "ordering" && !blitz && (
        <p className="key-hint" aria-hidden="true">
          {t("Tryk 1–4 for at svare · Enter for næste spørgsmål")}
        </p>
      )}
      {given && !blitz && (
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
                  {given.points.toLocaleString(locale())} point
                </span>
              )}
            </b>
            {!given.correct && correctOption && q.type !== "ordering" && (
              <p className="feedback-answer">
                {t("Svaret er")}{" "}
                <strong>
                  <QuizOptionText prompt={q.prompt}>
                    {correctOption.text}
                  </QuizOptionText>
                </strong>
              </p>
            )}
            {q.type === "ordering" && q.correctOrder && (
              <p className="feedback-answer">
                {t("Korrekt rækkefølge:")}{" "}
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
                ? t("Se resultatet")
                : solo
                  ? t("Næste spørgsmål")
                  : t("Videre til {name}", { name: nextPlayer.name })}
              <ArrowRight />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={reportSent}
              onClick={() => setReportOpen((value) => !value)}
            >
              <Flag />
              {reportSent ? t("Tak for hjælpen") : t("Er der noget galt?")}
            </Button>
          </div>
        </div>
      )}
      {given && reportOpen && !reportSent && (
        <Card className="mt-3 border-amber-500/40">
          <CardContent className="grid gap-3 p-4">
            <b>{t("Hvad bør vi se på?")}</b>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["wrong_answer", t("Forkert svar")],
                  ["unclear", t("Uklart spørgsmål")],
                  ["difficulty", t("Forkert niveau")],
                  ["bad_options", t("Dårlige svarmuligheder")],
                  ["outdated", t("Forældet information")],
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
              placeholder={t("Valgfri kort kommentar")}
              onChange={(event) => setReportNote(event.target.value)}
            />
            <Button
              onClick={async () => {
                await report(q.id, reportReason, reportNote);
                setReportSent(true);
                setReportOpen(false);
              }}
            >
              {t("Send rapport")}
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
      t("Fejlfri runde!"),
      t("Ikke én eneste fejl. Der er vist en quizmester i huset."),
    ];
  if (rate >= 0.8)
    return [
      t("Stærkt spillet!"),
      t("Det her kunne godt bære en plads på holdet til pubquizzen."),
    ];
  if (rate >= 0.6)
    return [
      t("Godt gået!"),
      t("Solidt over middel – og med plads til en revanche."),
    ];
  if (rate >= 0.4)
    return [
      t("Halvvejs i mål"),
      t("Nogle sad lige i skabet, andre drillede. Én runde mere?"),
    ];
  if (rate >= 0.2)
    return [
      t("Den drillede"),
      t("Spørgsmålene vandt denne gang. Tag en omkamp."),
    ];
  return [t("Av for den"), t("Herfra kan det kun gå fremad. Prøv igen!")];
}
function Results({
  game,
  go,
  replay,
  playLevel,
  practiceMissed,
  newAchievements,
  record,
  streak,
  busy,
}: {
  game: Game;
  go: (v: View) => void;
  replay: () => void;
  playLevel: (level: number) => void;
  practiceMissed: () => void;
  newAchievements: Achievement[];
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
  const isBlitz = game.setup.mode === "blitz";
  const awards = computeAwards(game);
  const missedCount = game.questions.filter(
    (question) =>
      game.answers.find((a) => a.questionId === question.id)?.correct !== true,
  ).length;
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
        name: categoryById(categoryId)?.name ?? t("Ukendt kategori"),
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
    ? t("Helt lige kamp – en revanche må afgøre det.")
    : winnerRate >= 0.8
      ? t("{name} leverede en vaskeægte quizmester-præstation.", {
          name: winner.name,
        })
      : winner.longestStreak >= 4
        ? t("{name} afgjorde kampen med en stærk stime på {longestStreak}.", {
            name: winner.name,
            longestStreak: winner.longestStreak,
          })
        : sorted.length > 1 && winner.score - sorted[1].score <= 100
          ? t("Det blev afgjort på marginalerne – en revanche ligger lige for.")
          : t("{name} holdt hovedet koldt og tog sejren.", {
              name: winner.name,
            });
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
    if (isBlitz) marks.splice(game.answers.length);
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
            text: t("{v0} % rigtige – klar til noget sværere?", {
              v0: Math.round(overallRate * 100),
            }),
          }
        : overallRate <= 0.3 && level > 1
          ? {
              level: level - 1,
              text: t("Det var en hård omgang. Prøv et lidt lettere niveau?"),
            }
          : null
      : null;
  const share = async () => {
    const score = winner.score.toLocaleString(locale());
    const [, month, day] = (game.dailyKey ?? "").split("-");
    const text = isDaily
      ? t(
          "{name} Dagens quiz {day}/{month}\n{correct}/{total} · {score} point{streak}\n{grid}\nwww.kvizy.dk",
          {
            name: APP_CONFIG.name,
            day: Number(day),
            month: Number(month),
            correct: winner.correct,
            total,
            score,
            streak: streak > 1 ? t(" · {streak} dage i træk", { streak }) : "",
            grid,
          },
        )
      : isBlitz
        ? t(
            "{name} Lynrunde · {correct} rigtige på {blitzSeconds} sek.\n{grid}\nKan du slå det? www.kvizy.dk",
            {
              name: APP_CONFIG.name,
              correct: winner.correct,
              blitzSeconds: APP_CONFIG.blitzSeconds,
              grid,
            },
          )
        : solo
          ? t(
              "{name} · {correct}/{total} · {score} point\n{grid}\nKan du slå det? www.kvizy.dk",
              {
                name: APP_CONFIG.name,
                correct: winner.correct,
                total,
                score,
                grid,
              },
            )
          : sharedWin
            ? t(
                "{name}: {winnerNames} delte førstepladsen med {score} point!",
                { name: APP_CONFIG.name, winnerNames, score },
              )
            : t("{name}: {winner} vandt med {score} point!", {
                name: APP_CONFIG.name,
                winner: winner.name,
                score,
              });
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
              <span>{t("rigtige")}</span>
            </div>
          </div>
          <h1 className="reveal mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            {soloTitle}
          </h1>
          <p className="reveal mt-3 text-xl">
            <b>
              {t("{correct} af {total}", {
                correct: winner.correct,
                total,
              })}
            </b>{" "}
            <span className="text-muted-foreground">
              ·{" "}
              {t("{score} point", {
                score: winner.score.toLocaleString(locale()),
              })}
            </span>
          </p>
          <p className="reveal mx-auto mt-2 max-w-xl text-muted-foreground">
            {soloText}
          </p>
          {isDaily ? (
            <p className="record-badge new">
              <Flame aria-hidden="true" />
              {streak > 1
                ? t("Dagens quiz · {streak} dage i træk", { streak })
                : t("Dagens quiz klaret")}
            </p>
          ) : record?.isRecord ? (
            <p className="record-badge new">
              <Trophy aria-hidden="true" />
              {t("Ny personlig rekord!")}
            </p>
          ) : record?.previous ? (
            <p className="record-badge">
              <Trophy aria-hidden="true" />
              {isBlitz
                ? t("Din rekord i lynrunden: {correct} rigtige", {
                    correct: record.previous.correct,
                  })
                : t("Din rekord på {total} spørgsmål: {correct} rigtige", {
                    total: record.previous.total,
                    correct: record.previous.correct,
                  })}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="winner-crown">👑</div>
          <Badge>{t("Spillet er slut")}</Badge>
          <h1 className="reveal mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            {sharedWin
              ? t("{winnerNames} deler sejren!", { winnerNames })
              : t("{name} vinder!", { name: winner.name })}
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
                      {t(
                        "{correct} af {answers} rigtige · bedste stime {streak}",
                        {
                          correct: p.correct,
                          answers: p.answers,
                          streak: p.longestStreak,
                        },
                      )}
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
      {newAchievements.length > 0 && (
        <div className="new-achievements" role="status">
          {newAchievements.map((achievement) => (
            <div key={achievement.id} className="achievement-toast">
              <span aria-hidden="true">{achievement.emoji}</span>
              <div>
                <small>{t("Ny præstation")}</small>
                <b>{t(achievement.title)}</b>
              </div>
            </div>
          ))}
        </div>
      )}
      {awards.length > 0 && (
        <div className="awards" aria-label={t("Titler fra runden")}>
          {awards.map((award) => {
            const holder = game.setup.players.find(
              (p) => p.id === award.playerId,
            );
            return (
              <div className="award" key={award.id}>
                <span aria-hidden="true">{award.emoji}</span>
                <b>{award.title}</b>
                <strong>
                  {holder?.avatar} {holder?.name}
                </strong>
                <small>{award.detail}</small>
              </div>
            );
          })}
        </div>
      )}
      <div className="result-stats my-7 grid gap-3 text-left sm:grid-cols-2">
        <ResultStat
          index={0}
          label={t("Længste stime")}
          value={
            longestStreak > 1
              ? t("{longestStreak} rigtige i træk", { longestStreak })
              : t("Ingen stime denne gang")
          }
        />
        <ResultStat
          index={1}
          label={t("Stærkeste kategori")}
          value={
            bestCategory
              ? `${bestCategory.emoji} ${bestCategory.name} · ${bestCategory.correct}/${bestCategory.total}`
              : t("Ingen rigtige svar")
          }
        />
        <ResultStat
          index={2}
          label={
            weakestCategory
              ? t("Her er der noget at hente")
              : t("Hurtigste svar")
          }
          value={
            weakestCategory
              ? `${weakestCategory.emoji} ${weakestCategory.name} · ${weakestCategory.correct}/${weakestCategory.total}`
              : fastest
                ? t("{s} sek.", { s: (fastest.responseMs / 1000).toFixed(1) })
                : t("Ingen rigtige svar")
          }
        />
        <ResultStat
          index={3}
          label={t("Flottest klaret")}
          value={
            hardestRightQuestion
              ? `${t(DIFFICULTY_LABELS[hardestRightQuestion.difficulty])}: ${hardestRightQuestion.prompt}`
              : fastest
                ? t("Hurtigste svar: {s} sek.", {
                    s: (fastest.responseMs / 1000).toFixed(1),
                  })
                : t("Næste runde bliver bedre")
          }
        />
      </div>
      {difficultyStats.length > 1 && (
        <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
          {difficultyStats.map((stat) => (
            <Badge key={stat.level} variant="secondary">
              {t(DIFFICULTY_LABELS[stat.level])}: {stat.correct}/{stat.total}
            </Badge>
          ))}
        </div>
      )}
      {solo &&
        !isDaily &&
        !isBlitz &&
        !game.practice &&
        missedCount > 0 &&
        missedCount < total && (
          <div className="level-nudge">
            <p>
              {missedCount === 1
                ? t("Ét spørgsmål drillede. Tag det igen, mens det er friskt?")
                : t(
                    "{missedCount} spørgsmål drillede. Tag dem igen, mens de er friske?",
                    { missedCount },
                  )}
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={practiceMissed}
            >
              {t("Øv fejlene")}
            </Button>
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
            {t("Prøv niveau «{level}»", {
              level: t(DIFFICULTY_LABELS[nudge.level]).toLowerCase(),
            })}
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
            ? t("Finder nye spørgsmål…")
            : isDaily
              ? t("Spil et hurtigt spil")
              : solo
                ? t("Spil igen")
                : t("Revanche")}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => go("review")}>
          <BookOpen />
          {t("Gennemgå svar")}
        </Button>
        <Button size="lg" variant="outline" onClick={share}>
          <Share2 />
          {copied ? t("Kopieret") : t("Del resultat")}
        </Button>
        <Button
          variant="ghost"
          className="sm:col-span-2"
          onClick={() => go("home")}
        >
          {t("Til forsiden")}
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
      <PageHead title={t("Gennemgang")} onBack={() => go("results")} />
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label={t("Filter")}
      >
        <Button
          size="sm"
          variant={onlyWrong ? "outline" : "default"}
          onClick={() => setOnlyWrong(false)}
        >
          {t("Alle ({n})", { n: rows.length })}
        </Button>
        <Button
          size="sm"
          variant={onlyWrong ? "default" : "outline"}
          disabled={wrongCount === 0}
          onClick={() => setOnlyWrong(true)}
        >
          {t("Kun forkerte ({n})", { n: wrongCount })}
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
                    {t(DIFFICULTY_LABELS[q.difficulty])}
                  </Badge>
                  <span
                    className={`review-verdict ${a?.correct ? "good" : "bad"}`}
                  >
                    {a?.correct ? <Check /> : <X />}
                    {a?.correct ? t("Rigtigt") : t("Forkert")}
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
                    {t("Dit svar:")}{" "}
                    <QuizOptionText prompt={q.prompt}>
                      {selectedOption.text}
                    </QuizOptionText>
                  </p>
                )}
                {correctOption && (
                  <p className="mt-1 text-sm">
                    {t("Rigtigt svar:")}{" "}
                    <strong>
                      <QuizOptionText prompt={q.prompt}>
                        {correctOption.text}
                      </QuizOptionText>
                    </strong>
                  </p>
                )}
                {q.type === "ordering" && q.correctOrder && (
                  <p className="mt-1 text-sm">
                    {t("Rigtig rækkefølge:")}{" "}
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
  achievements,
  go,
  busy,
  train,
}: {
  history: GameResult[];
  achievements: AchievementState;
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
      <PageHead title={t("Statistik")} onBack={() => go("home")} />
      {stats.games === 0 ? (
        <Empty
          icon="📊"
          title={t("Ingen statistik endnu")}
          text={t(
            "Spil et par runder, så dukker dine stærke og svage sider op her.",
          )}
        />
      ) : (
        <div className="stats">
          <p className="mb-4 text-sm text-muted-foreground">
            {stats.soloOnly
              ? t("Bygger på dine solospil blandt de seneste 30 spil.")
              : t("Bygger på de seneste 30 spil.")}
          </p>
          <div className="stat-tiles">
            {[
              [String(stats.games), t("spil")],
              [String(stats.answers), t("svar")],
              [`${Math.round(stats.rate * 100)} %`, t("rigtige")],
              [String(stats.bestStreak), t("længste stime")],
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
          <h2 className="mt-7 text-lg font-bold">
            {t("Præstationer · {n}/{total}", {
              n: Object.keys(achievements.unlocked).length,
              total: ACHIEVEMENTS.length,
            })}
          </h2>
          <div className="achievement-grid">
            {ACHIEVEMENTS.map((achievement) => {
              const done = Boolean(achievements.unlocked[achievement.id]);
              const value = Math.min(
                achievement.goal,
                achievement.value(achievements.counters),
              );
              return (
                <div
                  key={achievement.id}
                  className={`achievement ${done ? "done" : ""}`}
                >
                  <span aria-hidden="true">{achievement.emoji}</span>
                  <b>{t(achievement.title)}</b>
                  <small>{t(achievement.text)}</small>
                  {!done && achievement.goal > 1 && (
                    <em>
                      {value}/{achievement.goal}
                    </em>
                  )}
                </div>
              );
            })}
          </div>
          {weakest.length > 0 && (
            <div className="level-nudge mt-5">
              <p>
                {t("Dine svageste emner:")}{" "}
                {weakest
                  .map((id) => categoryById(id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <Button disabled={busy} onClick={() => train(weakest)}>
                <Target />
                {t("Træn dem · 10 spørgsmål")}
              </Button>
            </div>
          )}
          <h2 className="mb-3 mt-7 font-bold">{t("Efter kategori")}</h2>
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
                    {meta?.emoji} {meta?.name ?? t("Ukendt")}
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
                {t("Spil lidt mere, så vises kategorierne her.")}
              </p>
            )}
          </div>
          {stats.levels.length > 0 && (
            <>
              <h2 className="mb-3 mt-7 font-bold">{t("Efter niveau")}</h2>
              <div className="flex flex-wrap gap-2">
                {stats.levels.map((level) => (
                  <Badge key={level.level} variant="secondary">
                    {t(DIFFICULTY_LABELS[level.level])}: {level.correct}/
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
      <PageHead title={t("Spilhistorik")} onBack={() => go("home")} />
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
                        ? t("{names} delte førstepladsen", { names })
                        : t("{names} vandt", { names })}
                    </b>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.playedAt).toLocaleDateString(locale())} ·{" "}
                      {t("{n} spørgsmål", { n: r.questions.length })}
                    </p>
                  </div>
                  <strong>
                    {(winners[0]?.score ?? 0).toLocaleString(locale())}
                  </strong>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty
          icon="🏁"
          title={t("Ingen spil endnu")}
          text={t("Dit første resultat dukker op her.")}
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
      <PageHead title={t("Sådan spiller I")} onBack={() => go("home")} />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          [
            "1",
            t("Vælg holdet"),
            t("Tilføj spillere eller hold, kategorier og niveau."),
          ],
          [
            "2",
            t("Giv videre"),
            t("Den aktive spiller svarer og giver enheden videre."),
          ],
          [
            "3",
            t("Tænk. Vind."),
            t(
              "Et rigtigt svar giver 100 point. Ekstra point kræver et aktivt tilvalg.",
            ),
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
          <h2 className="font-bold">
            {t("Rum: alle svarer på deres egen telefon")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t(
              "Vælg «Opret rum» på forsiden på en laptop eller et tv. Alle andre går ind på kvizy.dk, vælger «Join rum» og taster koden – eller scanner QR-koden. Alle svarer samtidig, og jo hurtigere man svarer rigtigt, jo flere point (600–1.000). Rummet kører på værtens enhed, så værten skal holde siden åben. Virker det ikke på mobildata, så prøv at lade alle bruge samme Wi-Fi.",
            )}
          </p>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="font-bold">{t("Point der er nemme at forstå")}</h2>
          <p className="mt-2 text-muted-foreground">
            {t(
              "Et korrekt svar giver som standard altid 100 point, uanset svartid og streak. Hvis I aktivt vælger Tidsbonus, kan et hurtigt svar give op til 50 ekstra point. Streakbonus giver 25 ekstra point for hvert tidligere svar i den aktuelle streak, højst 75. Risiko og Finale ændrer kun pointene, når I selv vælger de spilindstillinger.",
            )}
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
                <h2 className="font-bold">{t("Brug KVIZY som en app")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(
                    "Føj KVIZY til hjemmeskærmen. Så åbner spillet uden browserbjælke og kan bruges i fuldskærm.",
                  )}
                </p>
                {canInstall ? (
                  <Button className="mt-4 w-full" onClick={install}>
                    <Download />
                    {t("Installér KVIZY")}
                  </Button>
                ) : installContext.ios ? (
                  <ol className="mt-4 grid gap-2 text-sm">
                    <li className="flex gap-2">
                      <Share2 className="size-5 shrink-0 text-primary" />
                      {t("Tryk på Del i Safari.")}
                    </li>
                    <li>{t("Vælg “Føj til hjemmeskærm”.")}</li>
                    <li>{t("Tryk “Tilføj”.")}</li>
                  </ol>
                ) : (
                  <p className="mt-4 text-sm">
                    {t(
                      "Åbn browsermenuen, og vælg “Installér app” eller “Føj til startskærm”.",
                    )}
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
  lang,
  onLang,
  onChange,
  setup,
  onRestore,
  go,
}: {
  value: AppSettings;
  lang: Lang;
  onLang: (lang: Lang) => void;
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
      setBackupStatus(t("Backupen er klar. Gem koden et sikkert sted."));
    } catch (error) {
      setBackupStatus(
        error instanceof Error
          ? error.message
          : t("Backup kunne ikke oprettes."),
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
        throw new Error(t("Backupen har et ukendt format."));
      onRestore(result.payload);
      setBackupStatus(
        t(
          "Gendannet: {length} tidligere spørgsmål og jeres seneste opsætning.",
          { length: result.payload.seen.length },
        ),
      );
    } catch (error) {
      setBackupStatus(
        error instanceof Error
          ? error.message
          : t("Backup kunne ikke gendannes."),
      );
    } finally {
      setBackupBusy(false);
    }
  };
  return (
    <>
      <PageHead title={t("Indstillinger")} onBack={() => go("home")} />
      <Card>
        <CardContent className="divide-y p-2">
          {[
            [t("Lydsignaler"), "sound"],
            [t("Diskret vibration"), "haptics"],
            [t("Reduceret bevægelse"), "reducedMotion"],
            [t("Høj kontrast"), "highContrast"],
            [t("Stor tekst (nem at læse op)"), "largeText"],
            [t("Bekræft svar (tryk to gange)"), "confirmAnswers"],
            [t("Læs-op: skjul svar, til værten viser dem"), "readAloud"],
          ].map(([label, key]) => (
            <div
              className="flex min-h-16 items-center justify-between p-3"
              key={key}
            >
              <Label>{label}</Label>
              <Switch
                aria-label={label}
                checked={value[key as keyof AppSettings] as boolean}
                onCheckedChange={(v) => onChange({ ...value, [key]: v })}
              />
            </div>
          ))}
          <div className="flex min-h-16 items-center justify-between p-3">
            <Label>{t("Sprog")}</Label>
            <LangSwitch lang={lang} onChange={onLang} />
          </div>
          <div className="flex min-h-16 items-center justify-between p-3">
            <Label>{t("Lyst tema")}</Label>
            <Switch
              aria-label={t("Lyst tema")}
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
          <h2 className="font-bold">{t("Backup af seneste spørgsmål")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "Gem historikken over sete spørgsmål og jeres seneste opsætning. Så undgår I unødige gentagelser, selv efter en geninstallation. Koden udløber efter ét år og indeholder ingen rapporter eller svar.",
            )}
          </p>
          <Button
            className="mt-4 w-full"
            variant="outline"
            disabled={backupBusy}
            onClick={createBackup}
          >
            <CloudUpload />
            {backupBusy ? t("Arbejder…") : t("Opret backupkode")}
          </Button>
          {backupCode && (
            <div className="mt-4 flex gap-2">
              <Input
                value={backupCode}
                readOnly
                aria-label={t("Din backupkode")}
              />
              <Button
                size="icon"
                variant="secondary"
                aria-label={t("Kopiér backupkode")}
                onClick={() => void navigator.clipboard.writeText(backupCode)}
              >
                <Copy />
              </Button>
            </div>
          )}
          <div className="mt-6 border-t pt-5">
            <Label htmlFor="backup-code">{t("Gendan med backupkode")}</Label>
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
              {t("Gendan backup")}
            </Button>
          </div>
          {backupStatus && (
            <p className="mt-4 text-sm" role="status">
              {backupStatus}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 flex justify-center" aria-label={t("Admin-genvej")}>
        <Link
          href="/admin"
          prefetch={false}
          aria-label={t("Åbn administration")}
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
    <div className="mb-5 flex items-center gap-2 sm:gap-4">
      <Button
        size="icon"
        variant="ghost"
        onClick={onBack}
        aria-label={t("Tilbage")}
      >
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
