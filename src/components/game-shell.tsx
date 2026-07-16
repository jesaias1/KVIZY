"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Crown,
  Download,
  Flag,
  Gamepad2,
  Heart,
  History,
  Menu,
  RefreshCw,
  Search,
  Share2,
  Smartphone,
  Settings,
  Shuffle,
  Volume2 as Sound2,
  VolumeX as SoundOff,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand-lockup";
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
import { CATEGORIES, DEFAULT_CATEGORIES, categoryById } from "@/lib/categories";
import {
  answerIsCorrect,
  buildResult,
  calculateQuestionPoints,
  newPlayer,
  rankPlayers,
  selectQuestions,
  shuffle,
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
import { hasPublicSource, hasUsefulExplanation } from "@/lib/question-quality";

type View =
  | "home"
  | "setup"
  | "play"
  | "results"
  | "history"
  | "help"
  | "settings"
  | "review";
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
    text: "10 blandede spørgsmål",
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
  return {
    ...fallback,
    ...saved,
    players: saved.players.slice(0, 12).map((player, index) => ({
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
    })),
    categoryIds: looksLikeOldDefaultSelection
      ? validSavedCategoryIds.filter((id) => id !== "cat-13")
      : validSavedCategoryIds,
    favorites: Array.isArray(saved.favorites)
      ? saved.favorites.filter((id) => validCategoryIds.has(id))
      : [],
    timeBonus: saved.timeBonus ?? false,
    streakBonus: saved.streakBonus ?? false,
  };
}
function tone(kind: "tap" | "correct" | "wrong" | "win", enabled: boolean) {
  if (!enabled) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    const c = new C(),
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.value = { tap: 360, correct: 720, wrong: 150, win: 900 }[kind];
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.15);
  } catch {}
}
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
    [hydrated, setHydrated] = useState(false);
  const { setTheme } = useTheme();
  useEffect(() => {
    const id = window.setTimeout(() => {
      setGame(load<Game | null>(APP_CONFIG.gameKey, null));
      setHistory(load(APP_CONFIG.historyKey, []));
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
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void import("@/data/questions")
      .then(async ({ SEED_QUESTIONS }) => {
        if (cancelled) return;
        setQuestionBank(SEED_QUESTIONS);
        const response = await fetch("/api/questions", {
          signal: controller.signal,
        });
        const data = response.ok ? await response.json() : { overrides: [] };
        if (
          cancelled ||
          !Array.isArray(data.overrides) ||
          data.overrides.length === 0
        )
          return;
        const overrides = new Map<string, Question>(
          data.overrides.map((question: Question) => [question.id, question]),
        );
        setQuestionBank(
          SEED_QUESTIONS.map(
            (question) => overrides.get(question.id) ?? question,
          ).filter((question) => question.status === "active"),
        );
      })
      .catch(() => {
        // Den indbyggede bank er den fulde offline-fallback.
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);
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
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const start = (same?: GameSetup) => {
    try {
      setStartError(null);
      if (questionBank.length === 0) {
        setStartError(
          "Spørgsmålene gøres stadig klar. Prøv igen om et øjeblik.",
        );
        setView("setup");
        return;
      }
      const s = same ?? setup;
      const normalized = {
        ...s,
        questionCount: s.mode === "quick" ? 10 : s.questionCount,
        players: s.mode === "solo" ? [s.players[0]] : s.players,
      };
      const seen = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
      const questions = selectQuestions(questionBank, normalized, seen);
      if (questions.length === 0) {
        setStartError(
          "Der er ikke nok spørgsmål i de valgte kategorier. Vælg mindst én kategori.",
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
      };
      setGame(g);
      safeSet(APP_CONFIG.gameKey, JSON.stringify(g));
      go("play");
    } catch {
      setStartError(
        "Spillet kunne ikke startes. Opsætningen er bevaret – prøv igen.",
      );
      setView("setup");
    }
  };
  const finish = (g: Game) => {
    const r = buildResult({ ...g, completedAt: new Date().toISOString() });
    const next = [r, ...history].slice(0, 30);
    setHistory(next);
    safeSet(APP_CONFIG.historyKey, JSON.stringify(next));
    safeRemove(APP_CONFIG.gameKey);
    setGame({ ...g, completedAt: r.playedAt });
    tone("win", settings.sound);
    confetti({
      particleCount: 90,
      spread: 65,
      origin: { y: 0.7 },
      colors: ["#ff6b35", "#35c2a6", "#fff"],
    });
    go("results");
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
          count: (previousSeen?.count ?? 0) + 1,
          correct,
        },
      ]),
    );
    tone(correct ? "correct" : "wrong", settings.sound);
    if (settings.haptics) navigator.vibrate?.(correct ? 30 : [40, 30, 40]);
  };
  const reportQuestion = async (
    questionId: string,
    reason: QuestionReportReason,
    note?: string,
  ) => {
    const report: LocalQuestionReport = {
      id: crypto.randomUUID(),
      questionId,
      reason,
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
      synced: false,
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
    };
    setGame(next);
    safeSet(APP_CONFIG.gameKey, JSON.stringify(next));
    tone("tap", settings.sound);
  };
  const content =
    view === "home" ? (
      <Home game={game} history={history} go={go} />
    ) : view === "setup" ? (
      <Setup
        setup={setup}
        setSetup={setSetup}
        step={step}
        setStep={setStep}
        start={start}
        startError={startError}
        questionsReady={questionBank.length > 0}
        go={go}
      />
    ) : view === "play" && game ? (
      <Play
        key={game.questions[game.index].id}
        game={game}
        answer={answer}
        next={nextQuestion}
        report={reportQuestion}
        setRisk={(n) => {
          const g = { ...game, riskMultiplier: n };
          setGame(g);
          safeSet(APP_CONFIG.gameKey, JSON.stringify(g));
        }}
      />
    ) : view === "results" && game ? (
      <Results game={game} go={go} replay={() => start(game.setup)} />
    ) : view === "history" ? (
      <HistoryView items={history} go={go} />
    ) : view === "settings" ? (
      <SettingsView
        value={settings}
        onChange={setSettings}
        questions={questionBank}
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
      <TopBar settings={settings} setSettings={setSettings} go={go} />
      <motion.div
        key={view}
        initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6 ${view === "play" ? "quiz-shell" : ""}`}
      >
        {content}
      </motion.div>
    </main>
  );
}

function TopBar({
  settings,
  setSettings,
  go,
}: {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  go: (v: View) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => go("home")}
          className="flex min-h-11 items-center text-left"
        >
          <BrandLockup compact />
        </button>
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
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 grid gap-2">
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => go("history")}
                >
                  <History />
                  Historik
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => go("help")}
                >
                  <BookOpen />
                  Sådan spiller I
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => go("settings")}
                >
                  <Settings />
                  Indstillinger
                </Button>
                <Button variant="ghost" className="justify-start" asChild>
                  <a href="/admin">
                    <Crown />
                    Administration
                  </a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
function Home({
  game,
  history,
  go,
}: {
  game: Game | null;
  history: GameResult[];
  go: (v: View) => void;
}) {
  return (
    <div className="home-grid">
      <div className="home-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="relative z-10 py-10 sm:py-20">
        <h1 className="max-w-2xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl">
          Quiz-aftenen starter <span className="text-primary">her.</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground">
          <strong className="text-foreground">{APP_CONFIG.tagline}.</strong>{" "}
          Dansk multiplayer på én skærm — uden login og ventetid.
        </p>
        <div className="mt-9 grid gap-3 sm:max-w-md">
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
  start: (s?: GameSetup) => void;
  startError: string | null;
  questionsReady: boolean;
  go: (v: View) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = CATEGORIES.filter((c) =>
    c.name.toLocaleLowerCase("da").includes(search.toLocaleLowerCase("da")),
  );
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
      <Progress value={((step + 1) / 3) * 100} className="mb-7" />
      {step === 0 && (
        <div className="space-y-8">
          <section>
            <Label className="mb-3 block text-base">Spilleform</Label>
            <div className="mode-grid">
              {modes.map((m) => (
                <button
                  key={m.id}
                  className={`mode-card ${setup.mode === m.id ? "selected" : ""}`}
                  onClick={() => {
                    const solo = m.id === "solo";
                    setSetup({
                      ...setup,
                      mode: m.id,
                      players: solo
                        ? [setup.players[0]]
                        : setup.players.length < 2
                          ? [...setup.players, newPlayer("Spiller 2", 1)]
                          : setup.players,
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
        <div>
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
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Søg i kategorier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="category-grid">
            {filtered.map((c) => {
              const selected = setup.categoryIds.includes(c.id),
                fav = setup.favorites.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`category-card ${selected ? "selected" : ""}`}
                >
                  <button
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
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {setup.categoryIds.length} kategorier valgt · favoritter optræder
            oftere
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spillets længde</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[10, 20, 30, 40, 60].map((n) => (
                <Button
                  key={n}
                  variant={setup.questionCount === n ? "default" : "outline"}
                  onClick={() => setSetup({ ...setup, questionCount: n })}
                >
                  {n}
                </Button>
              ))}
              <Input
                type="number"
                min={3}
                max={100}
                className="w-24"
                aria-label="Brugerdefineret antal"
                value={setup.questionCount}
                onChange={(e) =>
                  setSetup({
                    ...setup,
                    questionCount: Math.max(3, Math.min(100, +e.target.value)),
                  })
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sværhedsgrad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-end justify-between">
                <b className="text-4xl">{setup.difficulty}</b>
                <span className="max-w-52 text-right text-sm text-muted-foreground">
                  {DIFFICULTY_LABELS[setup.difficulty]}
                </span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[setup.difficulty]}
                onValueChange={([n]) => setSetup({ ...setup, difficulty: n })}
              />
              <div className="mt-5 grid grid-cols-3 gap-2">
                {(["fixed", "mixed", "rising"] as const).map((x, i) => (
                  <Button
                    size="sm"
                    key={x}
                    variant={setup.difficultyMode === x ? "secondary" : "ghost"}
                    onClick={() => setSetup({ ...setup, difficultyMode: x })}
                  >
                    {["Fast", "Blandet", "Stigende"][i]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-5">
              <Toggle
                label="Vis 30 sek. timer"
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
                label="Tidsbonus · valgfri"
                checked={setup.timeBonus}
                on={(v) =>
                  setSetup({ ...setup, timeBonus: v, timer: v || setup.timer })
                }
              />
              <Toggle
                label="Streakbonus · valgfri"
                checked={setup.streakBonus}
                on={(v) => setSetup({ ...setup, streakBonus: v })}
              />
              <Toggle
                label="Minuspoint"
                checked={setup.minusPoints}
                on={(v) => setSetup({ ...setup, minusPoints: v })}
              />
              <Toggle
                label="Finale · sidste 3"
                checked={setup.finale}
                on={(v) => setSetup({ ...setup, finale: v })}
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
function Play({
  game,
  answer,
  next,
  setRisk,
  report,
}: {
  game: Game;
  answer: (id: string, ms: number) => void;
  next: () => void;
  setRisk: (n: number) => void;
  report: (
    questionId: string,
    reason: QuestionReportReason,
    note?: string,
  ) => Promise<void>;
}) {
  const q = game.questions[game.index],
    p = game.setup.players[game.activePlayerIndex],
    given = game.answers.find((a) => a.questionId === q.id);
  const started = useRef(0);
  const [order, setOrder] = useState<string[]>([]),
    [reportOpen, setReportOpen] = useState(false),
    [reportReason, setReportReason] = useState<QuestionReportReason>("unclear"),
    [reportNote, setReportNote] = useState(""),
    [reportSent, setReportSent] = useState(false),
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
  const cat = categoryById(q.categoryId);
  return (
    <div className="quiz-screen mx-auto max-w-3xl">
      <div className="quiz-heading mb-4 flex items-center justify-between gap-3">
        <div>
          <small className="text-muted-foreground">
            Spørgsmål {game.index + 1} af {game.questions.length}
          </small>
          <h2 className="text-lg font-bold">
            {p.avatar} {p.name}s tur
          </h2>
        </div>
        <div className="flex gap-2">
          {game.setup.players.map((x) => (
            <div
              key={x.id}
              className={`score-pill ${x.id === p.id ? "active" : ""}`}
            >
              <span>{x.avatar}</span>
              <b>{x.score.toLocaleString("da-DK")}</b>
            </div>
          ))}
        </div>
      </div>
      <Progress value={((game.index + 1) / game.questions.length) * 100} />
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
            <b className={secondsLeft <= 5 ? "text-destructive" : ""}>
              {secondsLeft} sek.
            </b>
          </div>
          <Progress
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
      <Card className="question-card mt-6">
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge style={{ borderColor: cat?.color }} variant="outline">
              {game.setup.mode === "mystery" && !given
                ? "🎁 Mystery Mix"
                : `${cat?.emoji} ${cat?.name}`}
            </Badge>
            <Badge variant="secondary">Niveau {q.difficulty}</Badge>
            {typeLabels[q.type] && (
              <Badge className="quiz-type-badge" variant="outline">
                {typeLabels[q.type]}
              </Badge>
            )}
            {(q.finale || q.type === "finale") && <Badge>Finale · 2×</Badge>}
          </div>
          <CardTitle className="pt-4 text-2xl leading-tight sm:text-4xl">
            {q.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {q.options.map((o, i) => {
            const selected = given?.optionId === o.id,
              correct = o.id === q.correctOptionId,
              orderIndex = order.indexOf(o.id);
            return (
              <Button
                key={o.id}
                variant="outline"
                disabled={!!given}
                onClick={() =>
                  q.type === "ordering"
                    ? setOrder((current) =>
                        current.includes(o.id)
                          ? current.filter((id) => id !== o.id)
                          : [...current, o.id],
                      )
                    : answer(o.id, Date.now() - started.current)
                }
                className={`answer-button ${given && correct ? "correct" : ""} ${given && selected && !correct ? "wrong" : ""}`}
              >
                <span>
                  {q.type === "ordering" && orderIndex >= 0
                    ? orderIndex + 1
                    : String.fromCharCode(65 + i)}
                </span>
                <b>{o.text}</b>
                {given && correct && <Check className="ml-auto" />}
                {given && selected && !correct && <X className="ml-auto" />}
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
      {given && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`feedback ${given.correct ? "good" : "bad"}`}
        >
          <div>
            <b className="text-lg">
              {given.correct ? "Rigtigt!" : "Ikke helt"} ·{" "}
              {given.points > 0 ? "+" : ""}
              {given.points.toLocaleString("da-DK")} point
            </b>
            {hasUsefulExplanation(q.explanation) && <p>{q.explanation}</p>}
            {q.type === "ordering" && q.correctOrder && (
              <p>
                Korrekt rækkefølge:{" "}
                {q.correctOrder
                  .map(
                    (id) => q.options.find((option) => option.id === id)?.text,
                  )
                  .join(" → ")}
              </p>
            )}
            {hasPublicSource(q) && (
              <small>
                Kilde:{" "}
                {q.sourceUrl ? (
                  <a
                    className="underline"
                    href={q.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {q.sourceLabel}
                  </a>
                ) : (
                  q.sourceLabel
                )}
              </small>
            )}
          </div>
          <div className="feedback-actions grid gap-2">
            <Button className="next-question-button" size="lg" onClick={next}>
              Videre
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
        </motion.div>
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
function Results({
  game,
  go,
  replay,
}: {
  game: Game;
  go: (v: View) => void;
  replay: () => void;
}) {
  const standings = rankPlayers(game.setup.players),
    sorted = standings.map(({ player }) => player),
    winners = standings
      .filter(({ rank }) => rank === 1)
      .map(({ player }) => player),
    winner = winners[0],
    winnerNames = formatNames(winners.map((player) => player.name)),
    sharedWin = winners.length > 1;
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
        correct,
        total: answers.length,
        rate: correct / Math.max(1, answers.length),
      };
    })
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
  const bestCategory = categoryStats[0];
  const weakestCategory = [...categoryStats].sort(
    (a, b) => a.rate - b.rate || b.total - a.total,
  )[0];
  const fastest = [...game.answers]
    .filter((answer) => answer.correct)
    .sort((a, b) => a.responseMs - b.responseMs)[0];
  const hardestAnswer = [...game.answers].sort((a, b) => {
    const aq = game.questions.find((question) => question.id === a.questionId);
    const bq = game.questions.find((question) => question.id === b.questionId);
    return (
      Number(a.correct) - Number(b.correct) ||
      (bq?.difficulty ?? 0) - (aq?.difficulty ?? 0)
    );
  })[0];
  const hardestQuestion = game.questions.find(
    (question) => question.id === hardestAnswer?.questionId,
  );
  const typeStats = [
    ...new Set(game.questions.map((question) => question.type)),
  ]
    .map((type) => {
      const ids = new Set(
        game.questions
          .filter((question) => question.type === type)
          .map((question) => question.id),
      );
      const answers = game.answers.filter((answer) =>
        ids.has(answer.questionId),
      );
      return {
        type,
        total: answers.length,
        correct: answers.filter((answer) => answer.correct).length,
      };
    })
    .filter((stat) => stat.total > 0);
  const winnerRate = winner.correct / Math.max(1, winner.answers);
  const summary = sharedWin
    ? `${winnerNames} deler sejren efter en helt lige kamp.`
    : winnerRate >= 0.8
      ? `${winner.name} leverede en vaskeægte quizmester-præstation.`
      : winner.longestStreak >= 4
        ? `${winner.name} afgjorde kampen med en stærk stime på ${winner.longestStreak}.`
        : sorted.length > 1 && winner.score - sorted[1].score <= 100
          ? "Det blev afgjort på marginalerne – en revanche ligger lige for."
          : `${winner.name} holdt hovedet koldt og tog sejren.`;
  const share = async () => {
    const text = sharedWin
      ? `${APP_CONFIG.name}: ${winnerNames} delte førstepladsen med ${winner.score.toLocaleString("da-DK")} point!`
      : `${APP_CONFIG.name}: ${winner.name} vandt med ${winner.score.toLocaleString("da-DK")} point!`;
    if (navigator.share)
      await navigator.share({ title: APP_CONFIG.name, text });
    else await navigator.clipboard.writeText(text);
  };
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="winner-crown">👑</div>
      <Badge>Spillet er slut</Badge>
      <h1 className="mt-4 text-4xl font-black sm:text-6xl">
        {sharedWin ? `${winnerNames} deler sejren!` : `${winner.name} vinder!`}
      </h1>
      <p className="mt-2 text-xl text-muted-foreground">
        {winner.score.toLocaleString("da-DK")} point
        {!sharedWin && ` · ${winner.correct} rigtige`}
      </p>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{summary}</p>
      <div className="my-8 grid gap-3 text-left">
        {standings.map(({ player: p, rank }) => (
          <Card key={p.id} className={rank === 1 ? "winner-card" : ""}>
            <CardContent className="flex items-center gap-4 p-4">
              <b className="w-7 text-xl">{rank}.</b>
              <span className="text-3xl">{p.avatar}</span>
              <div className="flex-1">
                <b>{p.name}</b>
                <p className="text-sm text-muted-foreground">
                  {Math.round((p.correct / Math.max(1, p.answers)) * 100)}%
                  rigtige · længste streak {p.longestStreak}
                </p>
              </div>
              <strong>{p.score.toLocaleString("da-DK")}</strong>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mb-8 grid gap-3 text-left sm:grid-cols-2">
        <ResultStat
          label="Bedste kategori"
          value={
            bestCategory
              ? `${bestCategory.name} · ${Math.round(bestCategory.rate * 100)}%`
              : "Ingen data"
          }
        />
        <ResultStat
          label="Største udfordring"
          value={
            weakestCategory
              ? `${weakestCategory.name} · ${Math.round(weakestCategory.rate * 100)}%`
              : "Ingen data"
          }
        />
        <ResultStat
          label="Hurtigste korrekte svar"
          value={
            fastest
              ? `${(fastest.responseMs / 1000).toFixed(1)} sek.`
              : "Ingen korrekte svar"
          }
        />
        <ResultStat
          label="Sværest i spillet"
          value={
            hardestQuestion
              ? `Niveau ${hardestQuestion.difficulty} · ${hardestQuestion.prompt}`
              : "Ingen data"
          }
        />
      </div>
      <Card className="mb-8 text-left">
        <CardHeader>
          <CardTitle className="text-lg">
            Præstation efter spørgsmålstype
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {typeStats.map((stat) => (
            <Badge key={stat.type} variant="secondary">
              {typeLabels[stat.type] ?? "Klassisk"}: {stat.correct}/{stat.total}
            </Badge>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={replay}>
          <RefreshCw />
          Revanche
        </Button>
        <Button size="lg" variant="secondary" onClick={() => go("review")}>
          <BookOpen />
          Gennemgå svar
        </Button>
        <Button variant="outline" onClick={share}>
          Del resultat
        </Button>
        <Button variant="ghost" onClick={() => go("home")}>
          Til forsiden
        </Button>
      </div>
    </div>
  );
}
function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <small className="text-muted-foreground">{label}</small>
        <p className="mt-1 font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
function Review({ game, go }: { game: Game; go: (v: View) => void }) {
  return (
    <>
      <PageHead title="Gennemgang" onBack={() => go("results")} />
      <div className="grid gap-4">
        {game.questions.map((q, i) => {
          const a = game.answers.find((x) => x.questionId === q.id);
          return (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex justify-between">
                  <Badge variant="secondary">{i + 1}</Badge>
                  <Badge variant={a?.correct ? "default" : "destructive"}>
                    {a?.correct ? "Rigtigt" : "Forkert"}
                  </Badge>
                </div>
                <h3 className="mt-3 font-bold">{q.prompt}</h3>
                {hasUsefulExplanation(q.explanation) && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {q.explanation}
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
  questions,
  go,
}: {
  value: AppSettings;
  onChange: (s: AppSettings) => void;
  questions: Question[];
  go: (v: View) => void;
}) {
  const localReports = load<LocalQuestionReport[]>(APP_CONFIG.reportsKey, []);
  const downloadReports = () => {
    const data = localReports.map((report) => {
      const question = questions.find((item) => item.id === report.questionId);
      return {
        ...report,
        prompt: question?.prompt,
        options: question?.options,
        correctOptionId: question?.correctOptionId,
        explanation: question?.explanation,
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "kvizy-lokale-rapporter.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
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
          <h2 className="font-bold">Dine spørgsmålsrapporter</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Rapporterne gemmes på denne enhed, indtil en central database er
            tilsluttet. Eksporten indeholder spørgsmål og svar, men ingen
            adgangskoder.
          </p>
          <Button
            className="mt-4 w-full"
            variant="outline"
            disabled={localReports.length === 0}
            onClick={downloadReports}
          >
            <Download />
            Eksportér {localReports.length} rapporter
          </Button>
        </CardContent>
      </Card>
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
  checked,
  on,
}: {
  label: string;
  checked: boolean;
  on: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3">
      <Label>{label}</Label>
      <Switch aria-label={label} checked={checked} onCheckedChange={on} />
    </div>
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
