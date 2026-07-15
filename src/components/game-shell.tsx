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
  Crown,
  Gamepad2,
  Heart,
  History,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Shuffle,
  Volume2 as Sound2,
  VolumeX as SoundOff,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_CONFIG, DIFFICULTY_LABELS } from "@/lib/config";
import { CATEGORIES, categoryById } from "@/lib/categories";
import {
  buildResult,
  calculatePoints,
  newPlayer,
  selectQuestions,
  shuffle,
} from "@/lib/engine";
import type {
  AppSettings,
  Game,
  GameMode,
  GameResult,
  GameSetup,
  SeenQuestion,
} from "@/lib/types";
import { SEED_QUESTIONS } from "@/data/questions";

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
const emptySetup = (): GameSetup => ({
  mode: "classic",
  players: [newPlayer("Spiller 1", 0), newPlayer("Spiller 2", 1)],
  questionCount: 10,
  difficulty: 5,
  difficultyMode: "mixed",
  categoryIds: CATEGORIES.map((c) => c.id),
  favorites: [],
  timer: false,
  minusPoints: false,
  finale: true,
});

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
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

export function GameShell() {
  const [view, setView] = useState<View>("home"),
    [setup, setSetup] = useState<GameSetup>(emptySetup),
    [step, setStep] = useState(0),
    [game, setGame] = useState<Game | null>(null),
    [history, setHistory] = useState<GameResult[]>([]),
    [settings, setSettings] = useState(defaults),
    [hydrated, setHydrated] = useState(false);
  const { setTheme } = useTheme();
  useEffect(() => {
    const id = window.setTimeout(() => {
      setGame(load<Game | null>(APP_CONFIG.gameKey, null));
      setHistory(load(APP_CONFIG.historyKey, []));
      const s = load(APP_CONFIG.settingsKey, defaults);
      setSettings(s);
      setTheme(s.theme);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [setTheme]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(settings));
    setTheme(settings.theme);
    document.documentElement.classList.toggle(
      "contrast",
      settings.highContrast,
    );
  }, [settings, hydrated, setTheme]);
  const go = (v: View) => {
    tone("tap", settings.sound);
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const start = (same?: GameSetup) => {
    const s = same ?? setup;
    const normalized = {
      ...s,
      questionCount: s.mode === "quick" ? 10 : s.questionCount,
      players: s.mode === "solo" ? [s.players[0]] : s.players,
    };
    const seen = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
    const questions = selectQuestions(SEED_QUESTIONS, normalized, seen);
    if (questions.length === 0)
      return alert(
        "Der er ikke nok spørgsmål i de valgte kategorier. Vælg mindst én kategori.",
      );
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
    localStorage.setItem(APP_CONFIG.gameKey, JSON.stringify(g));
    go("play");
  };
  const finish = (g: Game) => {
    const r = buildResult({ ...g, completedAt: new Date().toISOString() });
    const next = [r, ...history].slice(0, 30);
    setHistory(next);
    localStorage.setItem(APP_CONFIG.historyKey, JSON.stringify(next));
    localStorage.removeItem(APP_CONFIG.gameKey);
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
      correct = optionId === q.correctOptionId,
      finale = q.type === "finale",
      points = calculatePoints(
        correct,
        responseMs,
        game.setup.timer,
        game.riskMultiplier,
        game.setup.minusPoints,
        finale,
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
    localStorage.setItem(APP_CONFIG.gameKey, JSON.stringify(next));
    const allSeen = load<SeenQuestion[]>(APP_CONFIG.seenKey, []);
    const previousSeen = allSeen.find((s) => s.id === q.id);
    const seen = allSeen.filter((s) => s.id !== q.id);
    localStorage.setItem(
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
    localStorage.setItem(APP_CONFIG.gameKey, JSON.stringify(next));
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
        go={go}
      />
    ) : view === "play" && game ? (
      <Play
        game={game}
        answer={answer}
        next={nextQuestion}
        setRisk={(n) => {
          const g = { ...game, riskMultiplier: n };
          setGame(g);
          localStorage.setItem(APP_CONFIG.gameKey, JSON.stringify(g));
        }}
      />
    ) : view === "results" && game ? (
      <Results game={game} go={go} replay={() => start(game.setup)} />
    ) : view === "history" ? (
      <HistoryView items={history} go={go} />
    ) : view === "settings" ? (
      <SettingsView value={settings} onChange={setSettings} go={go} />
    ) : view === "review" && game ? (
      <Review game={game} go={go} />
    ) : (
      <Help go={go} />
    );
  return (
    <main className="min-h-dvh safe-shell">
      <TopBar settings={settings} setSettings={setSettings} go={go} />
      <motion.div
        key={view}
        initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6"
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
          className="flex min-h-11 items-center gap-2 text-xl font-black tracking-tight"
        >
          <span className="logo-mark">K</span>
          {APP_CONFIG.name}
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
      <section className="py-10 sm:py-20">
        <Badge className="mb-5" variant="secondary">
          <Sparkles /> 318 kuraterede spørgsmål
        </Badge>
        <h1 className="max-w-2xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl">
          Quiz-aftenen starter <span className="text-primary">her.</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground">
          {APP_CONFIG.tagline} Dansk multiplayer på én skærm — uden login og
          ventetid.
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
      <aside className="relative hidden min-h-[520px] items-center justify-center lg:flex">
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
  go,
}: {
  setup: GameSetup;
  setSetup: (s: GameSetup) => void;
  step: number;
  setStep: (n: number) => void;
  start: (s?: GameSetup) => void;
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
                    <button
                      className="avatar-button"
                      onClick={() =>
                        setSetup({
                          ...setup,
                          players: setup.players.map((x) =>
                            x.id === p.id
                              ? {
                                  ...x,
                                  avatar: ["🦊", "🐻", "🦉", "🐼", "🦁", "🐙"][
                                    (i + 1) % 6
                                  ],
                                }
                              : x,
                          ),
                        })
                      }
                    >
                      {p.avatar}
                    </button>
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
                  categoryIds: shuffle(CATEGORIES)
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
              placeholder="Søg i 53 kategorier"
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
                    <small>6 spørgsmål</small>
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
                min={0}
                max={10}
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
            <CardContent className="grid gap-5 p-5 sm:grid-cols-3">
              <Toggle
                label="Timer og fartbonus"
                checked={setup.timer}
                on={(v) => setSetup({ ...setup, timer: v })}
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
              setup.players.some((p) => !p.name.trim()) ||
              !setup.categoryIds.length
            }
            onClick={() => start()}
          >
            Start quizzen
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
}: {
  game: Game;
  answer: (id: string, ms: number) => void;
  next: () => void;
  setRisk: (n: number) => void;
}) {
  const q = game.questions[game.index],
    p = game.setup.players[game.activePlayerIndex],
    given = game.answers.find((a) => a.questionId === q.id);
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, [q.id]);
  const cat = categoryById(q.categoryId);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
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
            {q.type === "finale" && <Badge>Finale · 2×</Badge>}
          </div>
          <CardTitle className="pt-4 text-2xl leading-tight sm:text-4xl">
            {q.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {q.options.map((o, i) => {
            const selected = given?.optionId === o.id,
              correct = o.id === q.correctOptionId;
            return (
              <Button
                key={o.id}
                variant="outline"
                disabled={!!given}
                onClick={() => answer(o.id, Date.now() - started.current)}
                className={`answer-button ${given && correct ? "correct" : ""} ${given && selected && !correct ? "wrong" : ""}`}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                <b>{o.text}</b>
                {given && correct && <Check className="ml-auto" />}
                {given && selected && !correct && <X className="ml-auto" />}
              </Button>
            );
          })}
        </CardContent>
      </Card>
      {given && (
        <motion.div
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
            <p>{q.explanation}</p>
            <small>Kilde: {q.sourceLabel}</small>
          </div>
          <Button size="lg" onClick={next}>
            Videre
            <ArrowRight />
          </Button>
        </motion.div>
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
  const sorted = [...game.setup.players].sort((a, b) => b.score - a.score),
    winner = sorted[0];
  const share = async () => {
    const text = `${APP_CONFIG.name}: ${winner.name} vandt med ${winner.score.toLocaleString("da-DK")} point!`;
    if (navigator.share)
      await navigator.share({ title: APP_CONFIG.name, text });
    else await navigator.clipboard.writeText(text);
  };
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="winner-crown">👑</div>
      <Badge>Spillet er slut</Badge>
      <h1 className="mt-4 text-4xl font-black sm:text-6xl">
        {winner.name} vinder!
      </h1>
      <p className="mt-2 text-xl text-muted-foreground">
        {winner.score.toLocaleString("da-DK")} point · {winner.correct} rigtige
      </p>
      <div className="my-8 grid gap-3 text-left">
        {sorted.map((p, i) => (
          <Card key={p.id} className={i === 0 ? "winner-card" : ""}>
            <CardContent className="flex items-center gap-4 p-4">
              <b className="w-7 text-xl">{i + 1}.</b>
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
                <p className="mt-2 text-sm text-muted-foreground">
                  {q.explanation}
                </p>
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
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Trophy className="text-primary" />
                <div className="flex-1">
                  <b>
                    {[...r.players].sort((a, b) => b.score - a.score)[0]?.name}{" "}
                    vandt
                  </b>
                  <p className="text-sm text-muted-foreground">
                    {new Date(r.playedAt).toLocaleDateString("da-DK")} ·{" "}
                    {r.questions.length} spørgsmål
                  </p>
                </div>
                <strong>
                  {Math.max(...r.players.map((p) => p.score)).toLocaleString(
                    "da-DK",
                  )}
                </strong>
              </CardContent>
            </Card>
          ))}
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
function Help({ go }: { go: (v: View) => void }) {
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
            "Rigtige og hurtige svar giver point. Finalen giver dobbelt.",
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
            Et korrekt svar giver 1.000 point. Timeren kan give op til 500
            bonuspoint. I Risiko koster et forkert 2×- eller 3×-svar halvdelen
            af indsatsen. De sidste tre finalespørgsmål giver dobbelt.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
function SettingsView({
  value,
  onChange,
  go,
}: {
  value: AppSettings;
  onChange: (s: AppSettings) => void;
  go: (v: View) => void;
}) {
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
      <Switch checked={checked} onCheckedChange={on} />
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
