"use client";

import type { DataConnection, Peer } from "peerjs";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANIMAL_AVATARS } from "@/lib/config";
import {
  CATEGORY_GROUPS,
  DANISH_CATEGORY_IDS,
  DEFAULT_CATEGORIES,
  categoryById,
} from "@/lib/categories";
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
  answerCounts,
  backToLobby,
  emptyRoom,
  nextQuestion,
  remainingMs,
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
  type RoomPublicPlayer,
  type RoomBuildOptions,
  type RoomQuestionPayload,
  type RoomStanding,
} from "@/lib/room-protocol";
import type { Question } from "@/lib/types";

const PROFILE_KEY = "kvizy-room-profile-v1";
const PID_KEY = "kvizy-room-pid-v1";

const COUNTS = [10, 15, 20, 30];
const LETTERS = ["A", "B", "C", "D"];
const LEVELS = [
  { value: 2, label: "Let" },
  { value: 3, label: "Almindelig" },
  { value: 4, label: "Svær" },
];
const allIds = DEFAULT_CATEGORIES.map((c) => c.id);
const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));
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

function useNow(active: boolean, every = 200) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(id);
  }, [active, every]);
  return now;
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

const publicPlayers = (state: RoomState): RoomPublicPlayer[] =>
  state.players.map(({ id, name, avatar }) => ({ id, name, avatar }));

function AnswerTile({
  index,
  text,
  state,
  count,
  onClick,
  disabled,
}: {
  index: number;
  text: string;
  state?: "correct" | "wrong" | "dim" | "picked";
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`room-tile opt-${index} ${state ?? ""}`}
      onClick={onClick}
      disabled={disabled || !onClick}
    >
      <span aria-hidden="true">{LETTERS[index]}</span>
      <b>{text}</b>
      {typeof count === "number" && <i>{count}</i>}
      {state === "correct" && <Check className="answer-mark" />}
    </button>
  );
}

function Leaderboard({
  rows,
  gained,
  limit,
}: {
  rows: (RoomStanding & { rank?: number })[];
  gained?: Record<string, number>;
  limit?: number;
}) {
  return (
    <ol className="room-board">
      {rows.slice(0, limit ?? rows.length).map((row, index) => (
        <li key={row.id} style={{ "--i": index } as React.CSSProperties}>
          <b>{row.rank ?? index + 1}.</b>
          <span aria-hidden="true">{row.avatar}</span>
          <em>{row.name}</em>
          {gained && gained[row.id] > 0 && <small>+{gained[row.id]}</small>}
          <strong>{row.score.toLocaleString("da-DK")}</strong>
        </li>
      ))}
    </ol>
  );
}

// ════════════════════════════════════════════════════════════
// Vært: storskærmen
// ════════════════════════════════════════════════════════════
export function RoomHost({
  buildQuestions,
  sound,
  onExit,
}: {
  buildQuestions: (options: RoomBuildOptions) => Promise<Question[]>;
  sound: boolean;
  onExit: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [session] = useState(readHostSession);
  const [state, setState] = useState<RoomState>(
    () => session?.state ?? emptyRoom(),
  );
  const [count, setCount] = useState(15);
  const [level, setLevel] = useState(3);
  const [categoryIds, setCategoryIds] = useState<string[]>(() =>
    DEFAULT_CATEGORIES.map((category) => category.id),
  );
  const codeRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const stateRef = useRef(state);
  const peerRef = useRef<Peer | null>(null);
  const conns = useRef(new Map<string, DataConnection>());
  const connPid = useRef(new Map<DataConnection, string>());
  const timer = useRef<number | null>(null);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
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
    if (message.t === "hello") {
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
            "Forbindelsen til mødeserveren blev afbrudt. Nye spillere kan midlertidigt ikke komme med.",
          );
          peer.reconnect();
        });
        peer.on("open", () => setNotice(null));
        peer.on("error", () => undefined);
        setCode(candidate);
        if (wanted && candidate === wanted) {
          setNotice(
            "Rummet er genoprettet. Spillerne forbinder igen af sig selv.",
          );
          const s = stateRef.current;
          if (s.phase === "question") {
            if (remainingMs(s, Date.now()) <= 0) doReveal();
            else armTimer();
          }
        }
        return;
      }
      if (!cancelled)
        setError(
          "Kunne ikke oprette et rum. Tjek internetforbindelsen og prøv igen.",
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
      created?.destroy();
      peerRef.current = null;
      // Forlader værten rummet med vilje, er det slut. En genindlæsning når
      // aldrig hertil, så rummet kan genoprettes.
      clearHostSession();
    };
    // handleData og handleClose bruger kun refs og stabile funktioner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinUrl =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/?rum=${code}`
      : "";
  useEffect(() => {
    if (!joinUrl) return;
    let live = true;
    void QRCode.toString(joinUrl, {
      type: "svg",
      margin: 1,
      color: { dark: "#120d0a", light: "#ffffff" },
    }).then((svg) => {
      if (live) setQr(svg);
    });
    return () => {
      live = false;
    };
  }, [joinUrl]);

  const start = async () => {
    if (busy || state.players.length === 0 || categoryIds.length === 0) return;
    setBusy(true);
    try {
      const questions = await buildQuestions({
        count,
        categoryIds,
        difficulty: level,
      });
      if (questions.length === 0) {
        setNotice("Der kunne ikke findes spørgsmål. Prøv igen om lidt.");
        return;
      }
      setNotice(null);
      apply((s) => startGame(s, questions, Date.now()));
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

  // Enter eller mellemrum går videre efter et spørgsmål.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, a")) return;
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
        <h1 className="text-3xl font-black">Rummet kunne ikke oprettes</h1>
        <p className="mt-3 text-muted-foreground">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Prøv igen</Button>
          <Button variant="ghost" onClick={onExit}>
            Til forsiden
          </Button>
        </div>
      </div>
    );
  if (!code)
    return (
      <div className="room-host mx-auto max-w-xl text-center" role="status">
        <h1 className="text-3xl font-black">Opretter rum…</h1>
      </div>
    );

  const q = state.questions[state.index];
  const board = standings(state);

  return (
    <div className="room-host mx-auto max-w-5xl">
      {notice && (
        <p className="room-notice" role="status">
          {notice}
        </p>
      )}

      {state.phase === "lobby" && (
        <div className="room-lobby">
          <div className="room-join">
            <p className="room-join-hint">
              Gå ind på{" "}
              <b>
                {joinUrl.replace(/^https?:\/\//, "").replace(/\/\?rum=.*/, "")}
              </b>{" "}
              og tast koden
            </p>
            <div
              className="room-code"
              aria-label={`Rumkode ${code.split("").join(" ")}`}
            >
              {code.split("").map((letter, index) => (
                <span key={index}>{letter}</span>
              ))}
            </div>
            {qr && (
              <div
                className="room-qr"
                role="img"
                aria-label="QR-kode til rummet"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            )}
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Kopieret" : "Kopiér link"}
            </Button>
          </div>
          <div className="room-players-panel">
            <h1 className="flex items-center gap-2 text-2xl font-black">
              <Users aria-hidden="true" />
              {state.players.length === 0
                ? "Venter på spillere…"
                : `${state.players.length} ${state.players.length === 1 ? "spiller" : "spillere"} med`}
            </h1>
            <ul className="room-chips" aria-live="polite">
              {state.players.map((p) => (
                <li key={p.id} className={p.connected ? "" : "away"}>
                  <span aria-hidden="true">{p.avatar}</span>
                  {p.name}
                  <button
                    type="button"
                    aria-label={`Fjern ${p.name}`}
                    onClick={() => kick(p.id)}
                  >
                    <X />
                  </button>
                </li>
              ))}
            </ul>
            <div className="room-settings">
              <span id="room-count-label">Antal spørgsmål</span>
              <div role="radiogroup" aria-labelledby="room-count-label">
                {COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={count === n}
                    className={count === n ? "on" : ""}
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="room-settings">
              <span id="room-level-label">Niveau</span>
              <div role="radiogroup" aria-labelledby="room-level-label">
                {LEVELS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={level === item.value}
                    className={level === item.value ? "on" : ""}
                    onClick={() => setLevel(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="room-topics">
              <span id="room-topics-label">Emner</span>
              <div role="group" aria-labelledby="room-topics-label">
                <button
                  type="button"
                  className={sameIds(categoryIds, allIds) ? "on" : ""}
                  onClick={() => setCategoryIds(allIds)}
                >
                  Alle
                </button>
                <button
                  type="button"
                  className={
                    sameIds(categoryIds, DANISH_CATEGORY_IDS) ? "on" : ""
                  }
                  onClick={() => setCategoryIds([...DANISH_CATEGORY_IDS])}
                >
                  Kun dansk
                </button>
                {CATEGORY_GROUPS.map((group) => {
                  const on = group.ids.every((id) => categoryIds.includes(id));
                  return (
                    <button
                      key={group.name}
                      type="button"
                      aria-pressed={on}
                      className={on ? "on" : ""}
                      onClick={() =>
                        setCategoryIds((current) =>
                          on
                            ? current.filter((id) => !group.ids.includes(id))
                            : [...new Set([...current, ...group.ids])],
                        )
                      }
                    >
                      {group.emoji} {group.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              size="lg"
              className="mt-4 h-14 w-full text-base"
              disabled={
                busy || state.players.length === 0 || categoryIds.length === 0
              }
              onClick={start}
            >
              {busy ? "Finder spørgsmål…" : "Start quizzen"}
              <ArrowRight />
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={onExit}>
              Luk rummet
            </Button>
          </div>
        </div>
      )}

      {state.phase === "question" && q && (
        <div className="room-stage">
          <div className="room-meta">
            <span>
              Spørgsmål {state.index + 1} af {state.questions.length}
            </span>
            <span>
              {Object.keys(state.answers).length} af {state.players.length} har
              svaret
            </span>
          </div>
          <div
            className={`blitz-bar ${secondsLeft <= 5 ? "hurry" : ""}`}
            role="timer"
            aria-label={`${secondsLeft} sekunder tilbage`}
          >
            <i style={{ width: `${(left / state.limitMs) * 100}%` }} />
            <b>{secondsLeft}</b>
          </div>
          <h1 className="room-prompt">{q.prompt}</h1>
          <div className={`room-tiles ${q.options.length === 2 ? "two" : ""}`}>
            {q.options.map((o, i) => (
              <AnswerTile key={o.id} index={i} text={o.text} />
            ))}
          </div>
          <div className="room-actions">
            <Button variant="outline" onClick={doReveal}>
              Vis svaret nu
            </Button>
          </div>
        </div>
      )}

      {state.phase === "reveal" && q && (
        <div className="room-stage">
          <div className="room-meta">
            <span>
              Spørgsmål {state.index + 1} af {state.questions.length}
            </span>
            <span>
              {Object.values(state.results).filter((r) => r.correct).length} af{" "}
              {state.players.length} svarede rigtigt
            </span>
          </div>
          <h1 className="room-prompt">{q.prompt}</h1>
          <div className={`room-tiles ${q.options.length === 2 ? "two" : ""}`}>
            {q.options.map((o, i) => (
              <AnswerTile
                key={o.id}
                index={i}
                text={o.text}
                count={answerCounts(state)[o.id] ?? 0}
                state={o.id === q.correctOptionId ? "correct" : "dim"}
              />
            ))}
          </div>
          {q.explanation && <p className="room-explanation">{q.explanation}</p>}
          <Leaderboard
            rows={board}
            limit={5}
            gained={Object.fromEntries(
              Object.entries(state.results).map(([id, r]) => [id, r.points]),
            )}
          />
          <div className="room-actions">
            <Button size="lg" className="h-14 px-8 text-base" onClick={next}>
              {state.index >= state.questions.length - 1
                ? "Se resultatet"
                : "Næste spørgsmål"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {state.phase === "end" && (
        <div className="room-stage text-center">
          <div className="winner-crown">👑</div>
          <h1 className="text-4xl font-black sm:text-5xl">
            {board[0]
              ? board.filter((b) => b.rank === 1).length > 1
                ? "Delt sejr!"
                : `${board[0].avatar} ${board[0].name} vinder!`
              : "Spillet er slut"}
          </h1>
          <Leaderboard rows={board} limit={10} />
          <div className="room-actions">
            <Button size="lg" className="h-14 px-8 text-base" onClick={again}>
              Spil igen med samme hold
            </Button>
            <Button variant="ghost" onClick={onExit}>
              Luk rummet
            </Button>
          </div>
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
}: {
  initialCode: string;
  haptics: boolean;
  onExit: () => void;
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
        setView({
          phase: "end",
          standings: message.standings,
          you: message.you,
        });
        break;
      case "full":
        activeRef.current = false;
        clearResume();
        setView({ phase: "problem", text: "Rummet er fuldt." });
        break;
      case "closed":
        activeRef.current = false;
        clearResume();
        setView({ phase: "problem", text: "Værten har lukket rummet." });
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
            text: "Rummet blev ikke fundet. Tjek koden – eller bed værten oprette et nyt.",
          });
        else if (attempts.current === 0)
          setView({
            phase: "problem",
            text: "Kunne ikke oprette forbindelse. Tjek internettet og prøv igen.",
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
              text: "Det tog for lang tid at få kontakt. Prøv igen, tjek at koden er rigtig, eller brug samme Wi-Fi som værten.",
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
            text: "Forbindelsen til værten blev tabt.",
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
        text: "Koden består af fire bogstaver, fx KFRT.",
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

  return (
    <div className="room-player mx-auto max-w-md">
      {reconnecting && view.phase !== "problem" && (
        <p className="room-notice" role="status">
          Forbinder igen…
        </p>
      )}

      {view.phase === "form" && (
        <form
          className="room-form"
          onSubmit={(event) => {
            event.preventDefault();
            join();
          }}
        >
          <h1 className="text-3xl font-black">Join et rum</h1>
          <label>
            Rumkode
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
            Dit navn
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="nickname"
              placeholder="Fx Mette"
            />
          </label>
          <fieldset>
            <legend>Vælg et dyr</legend>
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
            Join
            <ArrowRight />
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            type="button"
            onClick={leave}
          >
            Tilbage
          </Button>
        </form>
      )}

      {view.phase === "connecting" && (
        <div className="room-wait" role="status">
          <div className="room-spinner" aria-hidden="true" />
          <h1>Forbinder…</h1>
          <Button variant="ghost" onClick={leave}>
            Annuller
          </Button>
        </div>
      )}

      {view.phase === "lobby" && (
        <div className="room-wait" role="status">
          <span className="room-me" aria-hidden="true">
            {me?.avatar}
          </span>
          <h1>Du er med, {me?.name}!</h1>
          <p>
            {roster.length} {roster.length === 1 ? "spiller" : "spillere"} i
            rummet. Vent på, at værten starter quizzen.
          </p>
          <Button variant="ghost" onClick={leave}>
            Forlad rummet
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
            <span aria-label={`${secondsLeft} sekunder tilbage`}>
              {secondsLeft} s
            </span>
          </div>
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
                disabled={Boolean(picked) || secondsLeft === 0}
              />
            ))}
          </div>
          {picked && (
            <p className="room-sent" role="status">
              Svar modtaget – vent på de andre…
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
              ? "Rigtigt!"
              : view.you.answered
                ? "Ikke helt"
                : "Tiden løb ud"}
          </h1>
          {view.you.points > 0 && (
            <p className="room-points">+{view.you.points}</p>
          )}
          {view.you.streak >= 2 && (
            <p className="room-streak">🔥 {view.you.streak} i træk</p>
          )}
          <p>
            Du er nr. <b>{view.you.rank}</b> med{" "}
            <b>{view.you.score.toLocaleString("da-DK")}</b> point
          </p>
          <Leaderboard rows={view.leaders} />
        </div>
      )}

      {view.phase === "end" && (
        <div className="room-result" role="status">
          <span className="room-result-icon" aria-hidden="true">
            {view.you.rank === 1 ? "🏆" : "🎉"}
          </span>
          <h1>
            {view.you.rank === 1 ? "Du vandt!" : `Du blev nr. ${view.you.rank}`}
          </h1>
          <p>
            <b>{view.you.score.toLocaleString("da-DK")}</b> point
          </p>
          <Leaderboard rows={view.standings} limit={5} />
          <p className="text-sm text-muted-foreground">
            Bliv her, hvis værten starter en ny runde.
          </p>
          <Button variant="ghost" onClick={leave}>
            Forlad rummet
          </Button>
        </div>
      )}

      {view.phase === "problem" && (
        <div className="room-wait" role="alert">
          <span className="room-result-icon" aria-hidden="true">
            😕
          </span>
          <h1>Det lykkedes ikke</h1>
          <p>{view.text}</p>
          <Button
            onClick={() => {
              clearResume();
              teardown();
              setView({ phase: "form" });
            }}
          >
            Prøv igen
          </Button>
          <Button variant="ghost" onClick={leave}>
            Til forsiden
          </Button>
        </div>
      )}
    </div>
  );
}
