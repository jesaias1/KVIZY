"use client";

import type { DataConnection, Peer } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Cast,
  Check,
  Copy,
  Maximize2,
  Settings2,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AnswerTile,
  Leaderboard,
  Podium,
  RoomScreen,
  useNow,
} from "@/components/room-screen";
import { RoomSettingsSheet } from "@/components/room-settings-sheet";
import { ANIMAL_AVATARS } from "@/lib/config";
import { categoryById } from "@/lib/categories";
import { locale, t } from "@/lib/i18n";
import { playCue } from "@/lib/sound";
import {
  clearHostSession,
  clearResume,
  readHostSession,
  readResume,
  saveHostSession,
  saveResume,
} from "@/lib/room-session";
import { peerOptions } from "@/lib/room-net";
import {
  addPlayer,
  allAnswered,
  backToLobby,
  emptyRoom,
  nextQuestion,
  remainingMs,
  hasTimeLimit,
  ROOM_HOST_PID,
  removePlayer,
  revealQuestion,
  setConnected,
  standings,
  startGame,
  submitAnswer,
  type RoomState,
} from "@/lib/room-game";
import {
  clientMessageSchema,
  makeRoomCode,
  normalizeRoomCode,
  roomPeerId,
  sanitizeRoomName,
  type HostMessage,
  type RoomBuildOptions,
  type RoomPublicPlayer,
  type RoomQuestionPayload,
  type RoomStanding,
} from "@/lib/room-protocol";
import { buildScreenModel, isScreenModel } from "@/lib/room-screen";
import type { ScreenModel } from "@/lib/room-screen";
import {
  loadRoomSettings,
  saveRoomSettings,
  type RoomSettings,
} from "@/lib/room-settings";
import type { Question } from "@/lib/types";

const PROFILE_KEY = "kvizy-room-profile-v1";
const PID_KEY = "kvizy-room-pid-v1";

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

/** Skærmen må ikke gå i hvile, mens et rum er i gang. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () =>
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => undefined);
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}

function questionPayload(state: RoomState, now: number): RoomQuestionPayload {
  const q = state.questions[state.index];
  return {
    i: state.index,
    total: state.questions.length,
    prompt: q.prompt,
    qType: q.type,
    category: categoryById(q.categoryId)?.name ?? "",
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
    limitMs: state.limitMs,
    remainingMs: remainingMs(state, now),
  };
}

const screenContext = (code: string, settings: RoomSettings) => ({
  code,
  joinUrl: `${window.location.origin}/?rum=${code}`,
  summary: {
    count: settings.count,
    limitSec: settings.limitSec,
    level: settings.level,
    topics: settings.categoryIds.length,
  },
  categoryName: (id: string) => categoryById(id)?.name ?? "",
});

const publicPlayers = (state: RoomState): RoomPublicPlayer[] =>
  state.players.map(({ id, name, avatar }) => ({ id, name, avatar }));

// ════════════════════════════════════════════════════════════
// Vis på TV: åbn /?skaerm=KODE på en anden skærm eller send den med Cast
// ════════════════════════════════════════════════════════════
type PresentationRequestLike = {
  start: () => Promise<{ terminate?: () => void }>;
};
type PresentationCtor = new (urls: string[]) => PresentationRequestLike;

function TvSheet({
  code,
  trigger,
}: {
  code: string;
  trigger: React.ReactNode;
}) {
  const [casting, setCasting] = useState<"idle" | "busy" | "on" | "error">(
    "idle",
  );
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/?skaerm=${code}`;
  const Presentation =
    typeof window !== "undefined"
      ? (window as unknown as { PresentationRequest?: PresentationCtor })
          .PresentationRequest
      : undefined;
  const cast = async () => {
    if (!Presentation) return;
    setCasting("busy");
    try {
      await new Presentation([url]).start();
      setCasting("on");
    } catch {
      // Brugeren lukkede dialogen, eller ingen Cast-enhed blev fundet.
      setCasting("error");
    }
  };
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>{t("Vis spillet på et TV")}</SheetTitle>
          <SheetDescription>
            {t(
              "TV’et viser spørgsmålene. Telefonerne bruges til at svare, og du styrer det hele herfra.",
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="tv-steps">
          {Presentation && (
            <div className="tv-step">
              <Cast aria-hidden="true" />
              <div>
                <b>{t("Cast til et TV")}</b>
                <p>
                  {t(
                    "Virker med Chromecast og Google TV, når du bruger Chrome.",
                  )}
                </p>
                <Button onClick={cast} disabled={casting === "busy"}>
                  {casting === "busy" ? t("Søger…") : t("Vælg TV")}
                </Button>
                {casting === "on" && (
                  <p className="tv-ok">{t("Sendt til TV’et")}</p>
                )}
                {casting === "error" && (
                  <p className="tv-bad">
                    {t(
                      "Der blev ikke fundet noget TV. Brug i stedet den anden mulighed.",
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="tv-step">
            <Tv aria-hidden="true" />
            <div>
              <b>{t("Åbn på TV’ets browser")}</b>
              <p>
                {t("Gå ind på {adresse} og tast koden {kode}.", {
                  adresse: origin.replace(/^https?:\/\//, "") + "/?skaerm",
                  kode: code,
                })}
              </p>
            </div>
          </div>
          <div className="tv-step">
            <Maximize2 aria-hidden="true" />
            <div>
              <b>{t("Spejl skærmen")}</b>
              <p>
                {t(
                  "AirPlay, Miracast eller et HDMI-kabel virker også: tryk på Fuld skærm, når billedet er på TV’et.",
                )}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════════
// Vært: styrer spillet og viser storskærmen
// ════════════════════════════════════════════════════════════
export function RoomHost({
  buildQuestions,
  sound,
  speak,
  onExit,
}: {
  buildQuestions: (options: RoomBuildOptions) => Promise<Question[]>;
  sound: boolean;
  speak?: boolean;
  onExit: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [session] = useState(readHostSession);
  const [hostProfile] = useState(loadProfile);
  const [state, setState] = useState<RoomState>(
    () => session?.state ?? emptyRoom(),
  );
  const [settings, setSettings] = useState<RoomSettings>(loadRoomSettings);
  const codeRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const stateRef = useRef(state);
  const peerRef = useRef<Peer | null>(null);
  const conns = useRef(new Map<string, DataConnection>());
  const connPid = useRef(new Map<DataConnection, string>());
  const displays = useRef(new Set<DataConnection>());
  const timer = useRef<number | null>(null);
  const soundRef = useRef(sound);
  const settingsRef = useRef(settings);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    settingsRef.current = settings;
    saveRoomSettings(settings);
  }, [settings]);
  useWakeLock(Boolean(code));

  const apply = useCallback((fn: (s: RoomState) => RoomState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
    if (codeRef.current) saveHostSession(codeRef.current, next);
    return next;
  }, []);

  const send = (pid: string, message: HostMessage) => {
    try {
      conns.current.get(pid)?.send(message);
    } catch {
      // Forbindelsen er lukket; spilleren markeres via close-hændelsen.
    }
  };
  const broadcast = (message: HostMessage) => {
    for (const pid of conns.current.keys()) send(pid, message);
  };
  const sendLobby = () =>
    broadcast({ t: "lobby", players: publicPlayers(stateRef.current) });

  const joinUrl =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/?rum=${code}`
      : "";
  const screenModel = (now: number): ScreenModel | null =>
    codeRef.current
      ? buildScreenModel(
          stateRef.current,
          screenContext(codeRef.current, settingsRef.current),
          now,
        )
      : null;
  const sendScreen = (conn: DataConnection) => {
    const model = screenModel(Date.now());
    if (!model) return;
    try {
      conn.send({ t: "screen", model } satisfies HostMessage);
    } catch {
      // Skærmen er væk.
    }
  };

  // Ekstra skærme får ny model, hver gang noget ændrer sig.
  useEffect(() => {
    for (const conn of displays.current) sendScreen(conn);
    // sendScreen bruger kun refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, settings, code]);

  const revealMessage = (s: RoomState, pid: string): HostMessage => {
    const board = standings(s);
    const me = board.find((row) => row.id === pid);
    const player = s.players.find((p) => p.id === pid);
    const result = s.results[pid] ?? {
      correct: false,
      answered: false,
      points: 0,
    };
    return {
      t: "reveal",
      i: s.index,
      correctId: s.questions[s.index].correctOptionId ?? "",
      you: {
        ...result,
        score: me?.score ?? 0,
        rank: me?.rank ?? board.length,
        streak: player?.streak ?? 0,
      },
      leaders: board.slice(0, 3).map((row) => ({
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        score: row.score,
      })),
    };
  };
  const endMessage = (s: RoomState, pid: string): HostMessage => {
    const board = standings(s);
    const me = board.find((row) => row.id === pid);
    return {
      t: "end",
      standings: board.slice(0, 5).map(({ id, name, avatar, score }) => ({
        id,
        name,
        avatar,
        score,
      })),
      you: { rank: me?.rank ?? board.length, score: me?.score ?? 0 },
    };
  };

  const doReveal = () => {
    if (stateRef.current.phase !== "question") return;
    if (timer.current) window.clearTimeout(timer.current);
    const s = apply(revealQuestion);
    for (const pid of conns.current.keys()) send(pid, revealMessage(s, pid));
    if (soundRef.current) playCue("done", true);
  };
  const armTimer = () => {
    if (timer.current) window.clearTimeout(timer.current);
    const s = stateRef.current;
    if (!hasTimeLimit(s)) return;
    const index = s.index;
    timer.current = window.setTimeout(
      () => {
        if (
          stateRef.current.phase === "question" &&
          stateRef.current.index === index
        )
          doReveal();
      },
      remainingMs(s, Date.now()) + 250,
    );
  };
  const broadcastQuestion = () => {
    const s = stateRef.current;
    const payload = questionPayload(s, Date.now());
    broadcast({ t: "question", ...payload });
    armTimer();
  };
  const sendCurrent = (pid: string) => {
    const s = stateRef.current;
    if (s.phase === "question")
      send(pid, { t: "question", ...questionPayload(s, Date.now()) });
    else if (s.phase === "reveal") send(pid, revealMessage(s, pid));
    else if (s.phase === "end") send(pid, endMessage(s, pid));
  };

  const handleData = (conn: DataConnection, raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const parsed = clientMessageSchema.safeParse(raw);
    if (!parsed.success) return;
    const message = parsed.data;
    if (message.t === "display") {
      displays.current.add(conn);
      sendScreen(conn);
      return;
    }
    if (message.t === "hello") {
      // Værtens eget spillerid må ingen telefon låne.
      if (message.pid === ROOM_HOST_PID) return;
      const result = addPlayer(stateRef.current, {
        id: message.pid,
        name: message.name,
        avatar: message.avatar,
      });
      if (!result.accepted) {
        try {
          conn.send({ t: "full" } satisfies HostMessage);
        } catch {
          // Ingen at fortælle det til.
        }
        window.setTimeout(() => conn.close(), 300);
        return;
      }
      const previous = conns.current.get(message.pid);
      if (previous && previous !== conn) {
        connPid.current.delete(previous);
        previous.close();
      }
      conns.current.set(message.pid, conn);
      connPid.current.set(conn, message.pid);
      const s = apply(() => result.state);
      const me = s.players.find((p) => p.id === message.pid)!;
      send(message.pid, {
        t: "welcome",
        you: { id: me.id, name: me.name, avatar: me.avatar },
        players: publicPlayers(s),
      });
      sendLobby();
      sendCurrent(message.pid);
      if (soundRef.current) playCue("tap", true);
      return;
    }
    const pid = connPid.current.get(conn);
    if (!pid) return;
    const before = stateRef.current;
    const s = apply((cur) =>
      submitAnswer(cur, pid, message.i, message.o, Date.now()),
    );
    if (s !== before && allAnswered(s)) doReveal();
  };

  const handleClose = (conn: DataConnection) => {
    displays.current.delete(conn);
    const pid = connPid.current.get(conn);
    connPid.current.delete(conn);
    if (!pid || conns.current.get(pid) !== conn) return;
    conns.current.delete(pid);
    const s = apply((cur) => setConnected(cur, pid, false));
    sendLobby();
    if (allAnswered(s)) doReveal();
  };

  useEffect(() => {
    let cancelled = false;
    let created: Peer | null = null;
    const connections = conns.current;
    const screens = displays.current;
    void (async () => {
      const { Peer: PeerCtor } = await import("peerjs");
      const wanted = session?.code ?? null;
      for (let attempt = 0; attempt < 14 && !cancelled; attempt++) {
        // Efter en genindlæsning prøver vi først at få den samme kode igen.
        // Mødeserveren kan bruge et øjeblik på at give den fri.
        const resuming = wanted !== null && attempt < 8;
        if (resuming && attempt > 0) await sleep(1500);
        if (cancelled) return;
        const candidate = resuming ? wanted : makeRoomCode();
        const peer = await new Promise<Peer | null>((resolve) => {
          let settled = false;
          const p = new PeerCtor(roomPeerId(candidate), peerOptions());
          p.on("open", () => {
            settled = true;
            resolve(p);
          });
          p.on("error", () => {
            if (settled) return;
            settled = true;
            p.destroy();
            resolve(null);
          });
        });
        if (!peer) continue;
        if (cancelled) {
          peer.destroy();
          return;
        }
        created = peer;
        peerRef.current = peer;
        if (wanted && candidate !== wanted) {
          // Den gamle kode kunne ikke genbruges: start et nyt, tomt rum.
          stateRef.current = emptyRoom();
          setState(stateRef.current);
        }
        codeRef.current = candidate;
        saveHostSession(candidate, stateRef.current);
        peer.on("connection", (conn) => {
          conn.on("data", (data) => handleData(conn, data));
          conn.on("close", () => handleClose(conn));
          conn.on("error", () => handleClose(conn));
        });
        peer.on("disconnected", () => {
          // Mødepunktet er væk, men eksisterende forbindelser lever videre.
          setNotice(
            t(
              "Forbindelsen til mødeserveren blev afbrudt. Nye spillere kan midlertidigt ikke komme med.",
            ),
          );
          peer.reconnect();
        });
        peer.on("open", () => setNotice(null));
        peer.on("error", () => undefined);
        setCode(candidate);
        if (wanted && candidate === wanted) {
          setNotice(
            t("Rummet er genoprettet. Spillerne forbinder igen af sig selv."),
          );
          const s = stateRef.current;
          if (s.phase === "question") {
            if (hasTimeLimit(s) && remainingMs(s, Date.now()) <= 0) doReveal();
            else armTimer();
          }
        }
        return;
      }
      if (!cancelled)
        setError(
          t(
            "Kunne ikke oprette et rum. Tjek internetforbindelsen og prøv igen.",
          ),
        );
    })();
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
      for (const pid of connections.keys()) {
        try {
          connections.get(pid)?.send({ t: "closed" } satisfies HostMessage);
        } catch {
          // Lukker alligevel.
        }
      }
      for (const conn of screens) {
        try {
          conn.send({ t: "closed" } satisfies HostMessage);
        } catch {
          // Lukker alligevel.
        }
      }
      created?.destroy();
      peerRef.current = null;
      // Forlader værten rummet med vilje, er det slut. En genindlæsning når
      // aldrig hertil, så rummet kan genoprettes.
      clearHostSession();
    };
    // handleData og handleClose bruger kun refs og stabile funktioner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (busy || state.players.length === 0) return;
    setBusy(true);
    try {
      const questions = await buildQuestions({
        count: settings.count,
        categoryIds: settings.categoryIds,
        difficulty: settings.level,
      });
      if (questions.length === 0) {
        setNotice(t("Der kunne ikke findes spørgsmål. Prøv igen om lidt."));
        return;
      }
      setNotice(null);
      apply((s) =>
        startGame(s, questions, Date.now(), settings.limitSec * 1000),
      );
      broadcastQuestion();
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    if (stateRef.current.phase !== "reveal") return;
    const s = apply((cur) => nextQuestion(cur, Date.now()));
    if (s.phase === "question") broadcastQuestion();
    else if (s.phase === "end") {
      for (const pid of conns.current.keys()) send(pid, endMessage(s, pid));
      if (soundRef.current) playCue("win", true);
    }
  };
  const again = () => {
    apply(backToLobby);
    sendLobby();
  };
  const kick = (pid: string) => {
    if (pid === ROOM_HOST_PID) {
      setSettings((current) => ({ ...current, hostPlays: false }));
      return;
    }
    send(pid, { t: "closed" });
    const conn = conns.current.get(pid);
    conns.current.delete(pid);
    if (conn) {
      connPid.current.delete(conn);
      window.setTimeout(() => conn.close(), 200);
    }
    apply((s) => removePlayer(s, pid));
    sendLobby();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Udklipsholderen er ikke tilgængelig.
    }
  };
  // Værten kan spille med på samme skærm som en almindelig spiller.
  useEffect(() => {
    if (!code) return;
    const current = stateRef.current;
    const present = current.players.some((p) => p.id === ROOM_HOST_PID);
    if (current.phase !== "lobby") return;
    if (settings.hostPlays && !present) {
      apply(
        (s) =>
          addPlayer(s, {
            id: ROOM_HOST_PID,
            name: hostProfile.name || t("Vært"),
            avatar: hostProfile.avatar,
          }).state,
      );
      sendLobby();
    } else if (!settings.hostPlays && present) {
      apply((s) => removePlayer(s, ROOM_HOST_PID));
      sendLobby();
    }
    // apply og sendLobby bruger kun refs og stabile funktioner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hostPlays, code]);
  const hostAnswer = (optionId: string) => {
    const s = apply((cur) =>
      submitAnswer(cur, ROOM_HOST_PID, cur.index, optionId, Date.now()),
    );
    if (allAnswered(s)) doReveal();
  };
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  // Enter eller mellemrum går videre efter et spørgsmål.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, a, [role=dialog]")) return;
      if (
        settings.hostPlays &&
        state.phase === "question" &&
        !state.answers[ROOM_HOST_PID]
      ) {
        const index =
          "1234".indexOf(event.key) + 1 ||
          "abcd".indexOf(event.key.toLowerCase()) + 1;
        const option =
          index > 0
            ? state.questions[state.index]?.options[index - 1]
            : undefined;
        if (option) {
          event.preventDefault();
          hostAnswer(option.id);
          return;
        }
      }
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const now = useNow(state.phase === "question");
  const left = remainingMs(state, now);
  const secondsLeft = Math.ceil(left / 1000);
  useEffect(() => {
    if (state.phase === "question" && secondsLeft > 0 && secondsLeft <= 5)
      playCue("tick", soundRef.current);
  }, [secondsLeft, state.phase]);

  if (error)
    return (
      <div className="room-host mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-black">
          {t("Rummet kunne ikke oprettes")}
        </h1>
        <p className="mt-3 text-muted-foreground">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => window.location.reload()}>
            {t("Prøv igen")}
          </Button>
          <Button variant="ghost" onClick={onExit}>
            {t("Til forsiden")}
          </Button>
        </div>
      </div>
    );
  if (!code)
    return (
      <div className="room-host mx-auto max-w-xl text-center" role="status">
        <h1 className="text-3xl font-black">{t("Opretter rum…")}</h1>
      </div>
    );

  const model = buildScreenModel(state, screenContext(code, settings), now);
  const deadline = hasTimeLimit(state)
    ? state.startedAt + state.limitMs
    : undefined;
  const last = state.index >= state.questions.length - 1;

  const barButton = (label: string, icon: React.ReactNode) => (
    <Button variant="ghost" size="sm" aria-label={label} title={label}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  return (
    <div className="room-host mx-auto max-w-6xl">
      <div className="room-bar">
        <span className="room-bar-code" aria-label={t("Rumkode")}>
          {code}
        </span>
        <span className="room-bar-count">
          {state.players.length === 1
            ? t("1 spiller med")
            : t("{n} spillere med", { n: state.players.length })}
        </span>
        <div className="room-bar-actions">
          <TvSheet
            code={code}
            trigger={barButton(t("Vis på TV"), <Tv aria-hidden="true" />)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={fullscreen}
            aria-label={t("Fuld skærm")}
            title={t("Fuld skærm")}
          >
            <Maximize2 aria-hidden="true" />
            <span className="hidden sm:inline">{t("Fuld skærm")}</span>
          </Button>
          {state.phase === "lobby" && (
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              <span className="hidden sm:inline">
                {copied ? t("Kopieret") : t("Kopiér link")}
              </span>
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <p className="room-notice" role="status">
          {notice}
        </p>
      )}

      <RoomScreen
        model={model}
        deadline={deadline}
        speakAloud={speak}
        onAnswer={
          settings.hostPlays && state.phase === "question"
            ? hostAnswer
            : undefined
        }
        pickedId={
          settings.hostPlays
            ? (state.answers[ROOM_HOST_PID]?.optionId ?? null)
            : null
        }
        onKick={state.phase === "lobby" ? kick : undefined}
        lobbyExtra={
          <>
            <label className="room-hostplays">
              <span>
                <b>{t("Jeg spiller også")}</b>
                <small>
                  {t("Du svarer på denne skærm med mus eller tastatur")}
                </small>
              </span>
              <Switch
                aria-label={t("Jeg spiller også")}
                checked={settings.hostPlays}
                onCheckedChange={(hostPlays) =>
                  setSettings((current) => ({ ...current, hostPlays }))
                }
              />
            </label>
            <RoomSettingsSheet
              settings={settings}
              onChange={setSettings}
              trigger={
                <button type="button" className="room-settings-card">
                  <Settings2 aria-hidden="true" />
                  <span>
                    <b>{t("Spilindstillinger")}</b>
                    <small>{t("Emner, antal spørgsmål, tid og niveau")}</small>
                  </span>
                  <em>{t("Ændr")}</em>
                </button>
              }
            />
            <Button
              size="lg"
              className="room-start"
              disabled={busy || state.players.length === 0}
              onClick={start}
            >
              {busy ? t("Finder spørgsmål…") : t("Start quizzen")}
              <ArrowRight />
            </Button>
            <Button variant="ghost" className="w-full" onClick={onExit}>
              {t("Luk rummet")}
            </Button>
          </>
        }
      >
        {state.phase === "question" && settings.hostPlays && (
          <p className="room-host-hint">
            {state.answers[ROOM_HOST_PID]
              ? t("Dit svar er afgivet – vent på de andre")
              : t("Tryk på et svar, eller brug 1–4 / A–D på tastaturet")}
          </p>
        )}
        {state.phase === "reveal" && settings.hostPlays && (
          <p
            className={`room-host-result ${state.results[ROOM_HOST_PID]?.correct ? "good" : ""}`}
          >
            {state.results[ROOM_HOST_PID]?.correct
              ? t("Du svarede rigtigt! +{points}", {
                  points: state.results[ROOM_HOST_PID].points,
                })
              : state.results[ROOM_HOST_PID]?.answered
                ? t("Du svarede forkert")
                : t("Du nåede ikke at svare")}
          </p>
        )}
        {state.phase === "question" && (
          <div className="room-actions">
            <Button variant="outline" onClick={doReveal}>
              {t("Vis svaret nu")}
            </Button>
          </div>
        )}
        {state.phase === "reveal" && (
          <div className="room-actions">
            <Button size="lg" className="h-14 px-8 text-base" onClick={next}>
              {last ? t("Se resultatet") : t("Næste spørgsmål")}
              <ArrowRight />
            </Button>
          </div>
        )}
        {state.phase === "end" && (
          <div className="room-actions">
            <Button size="lg" className="h-14 px-8 text-base" onClick={again}>
              {t("Spil igen med samme hold")}
            </Button>
            <Button variant="ghost" onClick={onExit}>
              {t("Luk rummet")}
            </Button>
          </div>
        )}
      </RoomScreen>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Skærm: et TV eller en anden enhed, der kun viser spillet
// ════════════════════════════════════════════════════════════
export function RoomDisplay({
  initialCode,
  speak,
  onExit,
}: {
  initialCode: string;
  speak?: boolean;
  onExit: () => void;
}) {
  const [codeInput, setCodeInput] = useState(initialCode);
  const [model, setModel] = useState<ScreenModel | null>(null);
  const [deadline, setDeadline] = useState<number | undefined>();
  const [status, setStatus] = useState<
    "form" | "connecting" | "live" | "problem"
  >(initialCode ? "connecting" : "form");
  const [problem, setProblem] = useState("");
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const activeRef = useRef(false);
  const codeRef = useRef("");
  const attempts = useRef(0);
  useWakeLock(status === "live");

  const teardown = useCallback(() => {
    activeRef.current = false;
    connRef.current?.close();
    peerRef.current?.destroy();
    connRef.current = null;
    peerRef.current = null;
  }, []);
  useEffect(() => teardown, [teardown]);

  const connect = useCallback(async () => {
    const { Peer: PeerCtor } = await import("peerjs");
    if (!activeRef.current) return;
    let peer = peerRef.current;
    if (!peer || peer.destroyed) {
      peer = new PeerCtor(peerOptions());
      peerRef.current = peer;
      peer.on("error", () => {
        if (!activeRef.current || attempts.current > 0) return;
        setProblem(
          t(
            "Rummet blev ikke fundet. Tjek koden – eller bed værten oprette et nyt.",
          ),
        );
        setStatus("problem");
      });
    }
    const dial = () => {
      if (!activeRef.current || !peer) return;
      const conn = peer.connect(roomPeerId(codeRef.current), {
        reliable: true,
      });
      connRef.current = conn;
      const lost = () => {
        if (!activeRef.current || connRef.current !== conn) return;
        if (attempts.current >= 60) {
          setProblem(t("Forbindelsen til værten blev tabt."));
          setStatus("problem");
          return;
        }
        attempts.current += 1;
        window.setTimeout(() => {
          if (!activeRef.current) return;
          if (peer?.disconnected) peer.reconnect();
          dial();
        }, 2000);
      };
      const timeout = window.setTimeout(() => {
        if (!conn.open) lost();
      }, 12_000);
      conn.on("open", () => {
        window.clearTimeout(timeout);
        attempts.current = 0;
        conn.send({ t: "display" });
      });
      conn.on("data", (data) => {
        if (!data || typeof data !== "object") return;
        const message = data as HostMessage;
        if (message.t === "screen" && isScreenModel(message.model)) {
          setStatus("live");
          setModel(message.model);
          setDeadline(
            message.model.phase === "question"
              ? Date.now() + message.model.remainingMs
              : undefined,
          );
        } else if (message.t === "closed") {
          activeRef.current = false;
          setProblem(t("Værten har lukket rummet."));
          setStatus("problem");
        }
      });
      conn.on("close", lost);
      conn.on("error", lost);
    };
    if (peer.open) dial();
    else peer.once("open", dial);
  }, []);

  const join = useCallback(
    (raw: string) => {
      const normalized = normalizeRoomCode(raw);
      if (!normalized) {
        setProblem(t("Koden består af fire bogstaver, fx KFRT."));
        setStatus("problem");
        return;
      }
      codeRef.current = normalized;
      attempts.current = 0;
      activeRef.current = true;
      setStatus("connecting");
      void connect();
    },
    [connect],
  );

  // Et link som /?skaerm=ABCD går direkte i gang.
  useEffect(() => {
    if (!initialCode) return;
    const id = window.setTimeout(() => join(initialCode), 0);
    return () => window.clearTimeout(id);
    // Kører kun én gang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "live" && model)
    return (
      <div className="room-host room-tv mx-auto max-w-7xl">
        <RoomScreen model={model} deadline={deadline} speakAloud={speak} />
      </div>
    );

  return (
    <div className="room-player mx-auto max-w-md">
      {status === "form" && (
        <form
          className="room-form"
          onSubmit={(event) => {
            event.preventDefault();
            join(codeInput);
          }}
        >
          <h1 className="text-3xl font-black">{t("Brug som TV-skærm")}</h1>
          <p className="text-muted-foreground">
            {t(
              "Tast koden fra værten. Denne skærm viser spørgsmålene, men man kan ikke svare her.",
            )}
          </p>
          <label>
            {t("Rumkode")}
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="room-code-input"
              placeholder="ABCD"
            />
          </label>
          <Button size="lg" className="h-14 w-full text-base" type="submit">
            {t("Vis spillet")}
            <ArrowRight />
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            type="button"
            onClick={onExit}
          >
            {t("Tilbage")}
          </Button>
        </form>
      )}
      {(status === "connecting" || (status === "live" && !model)) && (
        <div className="room-wait" role="status">
          <div className="room-spinner" aria-hidden="true" />
          <h1>{t("Forbinder…")}</h1>
          <Button variant="ghost" onClick={onExit}>
            {t("Annuller")}
          </Button>
        </div>
      )}
      {status === "problem" && (
        <div className="room-wait" role="alert">
          <span className="room-result-icon" aria-hidden="true">
            😕
          </span>
          <h1>{t("Det lykkedes ikke")}</h1>
          <p>{problem}</p>
          <Button
            onClick={() => {
              teardown();
              setStatus("form");
            }}
          >
            {t("Prøv igen")}
          </Button>
          <Button variant="ghost" onClick={onExit}>
            {t("Til forsiden")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Spiller: telefonen
// ════════════════════════════════════════════════════════════
type PlayerView =
  | { phase: "form" }
  | { phase: "connecting" }
  | { phase: "lobby" }
  | { phase: "question"; q: RoomQuestionPayload; deadline: number }
  | {
      phase: "reveal";
      correctId: string;
      you: Extract<HostMessage, { t: "reveal" }>["you"];
      leaders: RoomStanding[];
    }
  | {
      phase: "end";
      standings: RoomStanding[];
      you: { rank: number; score: number };
    }
  | { phase: "problem"; text: string };

function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as {
      name?: string;
      avatar?: string;
    } | null;
    return { name: raw?.name ?? "", avatar: raw?.avatar ?? "🐶" };
  } catch {
    return { name: "", avatar: "🐶" };
  }
}

function playerId(): string {
  try {
    const existing = sessionStorage.getItem(PID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(PID_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function RoomPlayer({
  initialCode,
  haptics,
  onExit,
  onDisplay,
}: {
  initialCode: string;
  haptics: boolean;
  onExit: () => void;
  onDisplay?: () => void;
}) {
  const [resume] = useState(() => (initialCode ? null : readResume()));
  const [view, setView] = useState<PlayerView>(
    resume ? { phase: "connecting" } : { phase: "form" },
  );
  const [codeInput, setCodeInput] = useState(initialCode);
  const [profile] = useState(loadProfile);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [me, setMe] = useState<RoomPublicPlayer | null>(null);
  const [score, setScore] = useState(0);
  const [roster, setRoster] = useState<RoomPublicPlayer[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(Boolean(resume));
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const activeRef = useRef(false);
  const codeRef = useRef("");
  const pidRef = useRef("");
  const profileRef = useRef({ name: "", avatar: "🐶" });
  const attempts = useRef(0);
  const hapticsRef = useRef(haptics);
  useEffect(() => {
    hapticsRef.current = haptics;
  }, [haptics]);
  useWakeLock(view.phase !== "form" && view.phase !== "problem");

  const teardown = useCallback(() => {
    activeRef.current = false;
    connRef.current?.close();
    peerRef.current?.destroy();
    connRef.current = null;
    peerRef.current = null;
  }, []);
  useEffect(() => teardown, [teardown]);

  const handleHost = useCallback((message: HostMessage) => {
    switch (message.t) {
      case "welcome":
        attempts.current = 0;
        setReconnecting(false);
        setMe(message.you);
        setRoster(message.players);
        setView((v) =>
          v.phase === "connecting" || v.phase === "form"
            ? { phase: "lobby" }
            : v,
        );
        break;
      case "lobby":
        setRoster(message.players);
        setView((v) =>
          v.phase === "reveal" || v.phase === "end" ? { phase: "lobby" } : v,
        );
        break;
      case "question":
        setPicked(null);
        setView({
          phase: "question",
          q: message,
          deadline: Date.now() + message.remainingMs,
        });
        break;
      case "reveal":
        setScore(message.you.score);
        setView({
          phase: "reveal",
          correctId: message.correctId,
          you: message.you,
          leaders: message.leaders,
        });
        if (hapticsRef.current && "vibrate" in navigator)
          navigator.vibrate(message.you.correct ? [40] : [90, 60, 90]);
        break;
      case "end":
        setScore(message.you.score);
        setView({
          phase: "end",
          standings: message.standings,
          you: message.you,
        });
        break;
      case "full":
        activeRef.current = false;
        clearResume();
        setView({ phase: "problem", text: t("Rummet er fuldt.") });
        break;
      case "closed":
        activeRef.current = false;
        clearResume();
        setView({ phase: "problem", text: t("Værten har lukket rummet.") });
        break;
    }
  }, []);

  const connect = useCallback(async () => {
    const { Peer: PeerCtor } = await import("peerjs");
    if (!activeRef.current) return;
    let peer = peerRef.current;
    if (!peer || peer.destroyed) {
      peer = new PeerCtor(peerOptions());
      peerRef.current = peer;
      peer.on("error", (err) => {
        if (!activeRef.current) return;
        const type = (err as { type?: string }).type;
        if (type === "peer-unavailable" && attempts.current === 0)
          setView({
            phase: "problem",
            text: t(
              "Rummet blev ikke fundet. Tjek koden – eller bed værten oprette et nyt.",
            ),
          });
        else if (attempts.current === 0)
          setView({
            phase: "problem",
            text: t(
              "Kunne ikke oprette forbindelse. Tjek internettet og prøv igen.",
            ),
          });
      });
    }
    const dial = () => {
      if (!activeRef.current || !peer) return;
      const conn = peer.connect(roomPeerId(codeRef.current), {
        reliable: true,
      });
      connRef.current = conn;
      const timeout = window.setTimeout(
        () => {
          if (conn.open || !activeRef.current || connRef.current !== conn)
            return;
          if (attempts.current === 0)
            setView({
              phase: "problem",
              text: t(
                "Det tog for lang tid at få kontakt. Prøv igen, tjek at koden er rigtig, eller brug samme Wi-Fi som værten.",
              ),
            });
          else lost();
        },
        attempts.current === 0 ? 14_000 : 8_000,
      );
      conn.on("open", () => {
        window.clearTimeout(timeout);
        conn.send({
          t: "hello",
          pid: pidRef.current,
          name: profileRef.current.name,
          avatar: profileRef.current.avatar,
        });
      });
      conn.on("data", (data) => {
        if (data && typeof data === "object" && "t" in data)
          handleHost(data as HostMessage);
      });
      function lost() {
        window.clearTimeout(timeout);
        if (!activeRef.current || connRef.current !== conn) return;
        if (attempts.current >= 40) {
          setView({
            phase: "problem",
            text: t("Forbindelsen til værten blev tabt."),
          });
          return;
        }
        attempts.current += 1;
        setReconnecting(true);
        window.setTimeout(() => {
          if (!activeRef.current) return;
          if (peer?.disconnected) peer.reconnect();
          dial();
        }, 2000);
      }
      conn.on("close", lost);
      conn.on("error", lost);
    };
    if (peer.open) dial();
    else peer.once("open", dial);
  }, [handleHost]);

  const join = () => {
    const code = normalizeRoomCode(codeInput);
    if (!code) {
      setView({
        phase: "problem",
        text: t("Koden består af fire bogstaver, fx KFRT."),
      });
      return;
    }
    const cleanName = sanitizeRoomName(name);
    profileRef.current = { name: cleanName, avatar };
    codeRef.current = code;
    pidRef.current = playerId();
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ name: cleanName, avatar }),
      );
    } catch {
      // Profilen huskes bare ikke til næste gang.
    }
    saveResume({ code, name: cleanName, avatar });
    attempts.current = 0;
    activeRef.current = true;
    setView({ phase: "connecting" });
    void connect();
  };

  // En genindlæst telefon går selv ind i rummet igen.
  useEffect(() => {
    if (!resume) return;
    profileRef.current = {
      name: sanitizeRoomName(resume.name),
      avatar: resume.avatar,
    };
    codeRef.current = resume.code;
    pidRef.current = playerId();
    // En genindlæst telefon er ikke et nyt forsøg: værten kan også være ved
    // at genindlæse, så vi bliver ved med at prøve i et stykke tid.
    attempts.current = 1;
    activeRef.current = true;
    void connect();
  }, [resume, connect]);

  const answer = (optionId: string) => {
    if (view.phase !== "question" || picked) return;
    setPicked(optionId);
    if (hapticsRef.current && "vibrate" in navigator) navigator.vibrate(25);
    try {
      connRef.current?.send({ t: "answer", i: view.q.i, o: optionId });
    } catch {
      setPicked(null);
    }
  };

  const leave = () => {
    clearResume();
    teardown();
    onExit();
  };

  const now = useNow(view.phase === "question", 250);
  const limited = view.phase === "question" && view.q.limitMs > 0;
  const secondsLeft =
    view.phase === "question"
      ? Math.max(
          0,
          Math.min(
            view.q.limitMs / 1000,
            Math.ceil((view.deadline - now) / 1000),
          ),
        )
      : 0;
  const inGame =
    view.phase === "lobby" ||
    view.phase === "question" ||
    view.phase === "reveal" ||
    view.phase === "end";

  return (
    <div className="room-player mx-auto max-w-md">
      {reconnecting && view.phase !== "problem" && (
        <p className="room-notice" role="status">
          {t("Forbinder igen…")}
        </p>
      )}

      {inGame && me && (
        <div className="room-me-bar">
          <span aria-hidden="true">{me.avatar}</span>
          <b>{me.name}</b>
          <em>
            {score.toLocaleString(locale())} {t("point")}
          </em>
        </div>
      )}

      {view.phase === "form" && (
        <form
          className="room-form"
          onSubmit={(event) => {
            event.preventDefault();
            join();
          }}
        >
          <h1 className="text-3xl font-black">{t("Join et rum")}</h1>
          <label>
            {t("Rumkode")}
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              className="room-code-input"
              placeholder="ABCD"
            />
          </label>
          <label>
            {t("Dit navn")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="nickname"
              placeholder={t("Fx Mette")}
            />
          </label>
          <fieldset>
            <legend>{t("Vælg et dyr")}</legend>
            <div className="room-avatars">
              {ANIMAL_AVATARS.slice(0, 15).map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={avatar === a}
                  className={avatar === a ? "on" : ""}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
          <Button size="lg" className="h-14 w-full text-base" type="submit">
            {t("Join")}
            <ArrowRight />
          </Button>
          {onDisplay && (
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => {
                teardown();
                onDisplay();
              }}
            >
              <Tv aria-hidden="true" />
              {t("Brug denne skærm som TV")}
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full"
            type="button"
            onClick={leave}
          >
            {t("Tilbage")}
          </Button>
        </form>
      )}

      {view.phase === "connecting" && (
        <div className="room-wait" role="status">
          <div className="room-spinner" aria-hidden="true" />
          <h1>{t("Forbinder…")}</h1>
          <Button variant="ghost" onClick={leave}>
            {t("Annuller")}
          </Button>
        </div>
      )}

      {view.phase === "lobby" && (
        <div className="room-wait" role="status">
          <span className="room-me" aria-hidden="true">
            {me?.avatar}
          </span>
          <h1>{t("Du er med, {name}!", { name: me?.name ?? "" })}</h1>
          <p>
            {roster.length === 1
              ? t("1 spiller i rummet. Vent på, at værten starter quizzen.")
              : t(
                  "{n} spillere i rummet. Vent på, at værten starter quizzen.",
                  {
                    n: roster.length,
                  },
                )}
          </p>
          <Button variant="ghost" onClick={leave}>
            {t("Forlad rummet")}
          </Button>
        </div>
      )}

      {view.phase === "question" && (
        <div className="room-phone-q">
          <div className="room-meta">
            <span>
              {view.q.i + 1} / {view.q.total}
            </span>
            <span>{view.q.category}</span>
            {limited ? (
              <span
                className={secondsLeft <= 5 ? "hurry" : ""}
                aria-label={t("{secondsLeft} sekunder tilbage", {
                  secondsLeft,
                })}
              >
                {secondsLeft} s
              </span>
            ) : (
              <span>{t("Ingen tidsgrænse")}</span>
            )}
          </div>
          {limited && (
            <div className="room-progress" aria-hidden="true">
              <i
                style={{
                  width: `${Math.max(0, Math.min(100, ((view.deadline - now) / view.q.limitMs) * 100))}%`,
                }}
              />
            </div>
          )}
          <h1 className="room-phone-prompt">{view.q.prompt}</h1>
          <div
            className={`room-tiles ${view.q.options.length === 2 ? "two" : ""}`}
          >
            {view.q.options.map((o, i) => (
              <AnswerTile
                key={o.id}
                index={i}
                text={o.text}
                state={
                  picked ? (picked === o.id ? "picked" : "dim") : undefined
                }
                onClick={() => answer(o.id)}
                disabled={Boolean(picked) || (limited && secondsLeft === 0)}
              />
            ))}
          </div>
          {picked && (
            <p className="room-sent" role="status">
              {t("Svar modtaget – vent på de andre…")}
            </p>
          )}
        </div>
      )}

      {view.phase === "reveal" && (
        <div
          className={`room-result ${view.you.correct ? "good" : "bad"}`}
          role="status"
        >
          <span className="room-result-icon" aria-hidden="true">
            {view.you.correct ? "✅" : view.you.answered ? "❌" : "⏰"}
          </span>
          <h1>
            {view.you.correct
              ? t("Rigtigt!")
              : view.you.answered
                ? t("Ikke helt")
                : t("Tiden løb ud")}
          </h1>
          {view.you.points > 0 && (
            <p className="room-points">+{view.you.points}</p>
          )}
          {view.you.streak >= 2 && (
            <p className="room-streak">
              🔥 {t("{n} i træk", { n: view.you.streak })}
            </p>
          )}
          <p>
            {t("Du er nr.")} <b>{view.you.rank}</b> {t("med")}{" "}
            <b>{view.you.score.toLocaleString(locale())}</b> {t("point")}
          </p>
          <Leaderboard rows={view.leaders} highlight={me?.id} />
        </div>
      )}

      {view.phase === "end" && (
        <div className="room-result" role="status">
          <span className="room-result-icon" aria-hidden="true">
            {view.you.rank === 1 ? "🏆" : "🎉"}
          </span>
          <h1>
            {view.you.rank === 1
              ? t("Du vandt!")
              : t("Du blev nr. {rank}", { rank: view.you.rank })}
          </h1>
          <p>
            <b>{view.you.score.toLocaleString(locale())}</b> {t("point")}
          </p>
          {view.standings.length >= 3 ? (
            <Podium
              rows={view.standings.map((row, index) => ({
                ...row,
                rank: index + 1,
              }))}
            />
          ) : (
            <Leaderboard rows={view.standings} limit={5} highlight={me?.id} />
          )}
          <p className="text-sm text-muted-foreground">
            {t("Bliv her, hvis værten starter en ny runde.")}
          </p>
          <Button variant="ghost" onClick={leave}>
            {t("Forlad rummet")}
          </Button>
        </div>
      )}

      {view.phase === "problem" && (
        <div className="room-wait" role="alert">
          <span className="room-result-icon" aria-hidden="true">
            😕
          </span>
          <h1>{t("Det lykkedes ikke")}</h1>
          <p>{view.text}</p>
          <Button
            onClick={() => {
              clearResume();
              teardown();
              setView({ phase: "form" });
            }}
          >
            {t("Prøv igen")}
          </Button>
          <Button variant="ghost" onClick={leave}>
            {t("Til forsiden")}
          </Button>
        </div>
      )}
    </div>
  );
}
