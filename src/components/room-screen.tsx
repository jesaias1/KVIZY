"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Check, Users } from "lucide-react";
import { locale, t } from "@/lib/i18n";
import { questionSpeech, speak, stopSpeaking } from "@/lib/speech";
import type { ScreenModel } from "@/lib/room-screen";
import type { RoomStanding } from "@/lib/room-protocol";

const LETTERS = ["A", "B", "C", "D"];

export function useNow(active: boolean, every = 200) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(id);
  }, [active, every]);
  return now;
}

export function AnswerTile({
  index,
  text,
  state,
  count,
  share,
  onClick,
  disabled,
}: {
  index: number;
  text: string;
  state?: "correct" | "wrong" | "dim" | "picked";
  count?: number;
  share?: number;
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
      {typeof share === "number" && (
        <u
          aria-hidden="true"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      )}
      <span aria-hidden="true">{LETTERS[index]}</span>
      <b>{text}</b>
      {typeof count === "number" && <i>{count}</i>}
      {state === "correct" && <Check className="answer-mark" />}
    </button>
  );
}

export function Leaderboard({
  rows,
  gained,
  limit,
  highlight,
}: {
  rows: (RoomStanding & { rank?: number })[];
  gained?: Record<string, number>;
  limit?: number;
  highlight?: string;
}) {
  return (
    <ol className="room-board">
      {rows.slice(0, limit ?? rows.length).map((row, index) => (
        <li
          key={row.id}
          className={row.id === highlight ? "me" : ""}
          style={{ "--i": index } as React.CSSProperties}
        >
          <b>{row.rank ?? index + 1}.</b>
          <span aria-hidden="true">{row.avatar}</span>
          <em>{row.name}</em>
          {gained && gained[row.id] > 0 && <small>+{gained[row.id]}</small>}
          <strong>{row.score.toLocaleString(locale())}</strong>
        </li>
      ))}
    </ol>
  );
}

/** Podiet til slutskærmen: nr. 2 – 1 – 3. */
export function Podium({
  rows,
}: {
  rows: (RoomStanding & { rank: number })[];
}) {
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="room-podium" role="list">
      {order.map((row) => (
        <div
          key={row.id}
          role="listitem"
          className={`step rank-${row.rank}`}
          style={{ "--i": row.rank } as React.CSSProperties}
        >
          <span className="avatar" aria-hidden="true">
            {row.avatar}
          </span>
          <em>{row.name}</em>
          <strong>{row.score.toLocaleString(locale())}</strong>
          <div className="block">
            <b>{row.rank}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimerRing({ left, limit }: { left: number; limit: number }) {
  const seconds = Math.ceil(left / 1000);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const fraction = limit > 0 ? Math.max(0, Math.min(1, left / limit)) : 0;
  return (
    <div
      className={`room-timer ${seconds <= 5 ? "hurry" : ""}`}
      role="timer"
      aria-label={t("{secondsLeft} sekunder tilbage", { secondsLeft: seconds })}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} className="track" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="fill"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <b>{seconds}</b>
    </div>
  );
}

function JoinCard({ code, joinUrl }: { code: string; joinUrl: string }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
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
  const address = joinUrl.replace(/^https?:\/\//, "").replace(/\/\?rum=.*/, "");
  return (
    <section className="room-join">
      <p className="room-join-hint">
        {t("Gå ind på {adresse} og tast koden", { adresse: address })}
      </p>
      <div
        className="room-code"
        aria-label={t("Rumkode {kode}", { kode: code.split("").join(" ") })}
      >
        {code.split("").map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
      </div>
      {qr && (
        <div
          className="room-qr"
          role="img"
          aria-label={t("QR-kode til rummet")}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      )}
    </section>
  );
}

/**
 * Selve storskærmen. Den bruges både af værten og af en ekstra skærm (TV), og
 * den tegner kun – ingen knapper til at styre spillet.
 */
export function RoomScreen({
  model,
  deadline,
  lobbyExtra,
  onKick,
  speakAloud,
  onAnswer,
  pickedId,
  children,
}: {
  model: ScreenModel;
  /** Hvornår spørgsmålet lukker (ms siden 1970). */
  deadline?: number;
  /** Plads til værtens knapper i lobbyen. */
  lobbyExtra?: React.ReactNode;
  onKick?: (id: string) => void;
  /** Læs spørgsmålet højt, når det vises. */
  speakAloud?: boolean;
  /** Gør svarfelterne til knapper, så værten kan spille med. */
  onAnswer?: (optionId: string) => void;
  pickedId?: string | null;
  children?: React.ReactNode;
}) {
  const now = useNow(model.phase === "question");
  const spokenIndex = model.phase === "question" ? model.i : -1;
  useEffect(() => {
    if (!speakAloud || model.phase !== "question") return;
    speak(
      questionSpeech(
        model.prompt,
        model.options.map((option) => option.text),
      ),
    );
    return stopSpeaking;
    // Kører kun, når et nyt spørgsmål vises.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakAloud, spokenIndex]);
  if (model.phase === "lobby") {
    const n = model.players.length;
    return (
      <div className="room-lobby">
        <JoinCard code={model.code} joinUrl={model.joinUrl} />
        <section className="room-players-panel">
          <h1 className="room-heading">
            <Users aria-hidden="true" />
            {n === 0
              ? t("Venter på spillere…")
              : n === 1
                ? t("1 spiller med")
                : t("{n} spillere med", { n })}
          </h1>
          <ul className="room-avatars-grid" aria-live="polite">
            {model.players.map((p, index) => (
              <li
                key={p.id}
                className={p.away ? "away" : ""}
                style={{ "--i": index } as React.CSSProperties}
              >
                <span aria-hidden="true">{p.avatar}</span>
                <em>{p.name}</em>
                {onKick && (
                  <button
                    type="button"
                    aria-label={t("Fjern {name}", { name: p.name })}
                    onClick={() => onKick(p.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {n === 0 && (
              <li className="empty">{t("Scan koden med din telefon")}</li>
            )}
          </ul>
          <p className="room-summary">
            {model.summary.limitSec > 0
              ? t("{count} spørgsmål · {sec} sek. · {topics} emner", {
                  count: model.summary.count,
                  sec: model.summary.limitSec,
                  topics: model.summary.topics,
                })
              : t("{count} spørgsmål · ingen tidsgrænse · {topics} emner", {
                  count: model.summary.count,
                  topics: model.summary.topics,
                })}
          </p>
          {lobbyExtra}
        </section>
      </div>
    );
  }

  if (model.phase === "question") {
    const left = deadline ? Math.max(0, deadline - now) : model.remainingMs;
    const answered = new Set(model.answeredIds);
    return (
      <div className="room-stage">
        <div className="room-progress" aria-hidden="true">
          <i style={{ width: `${((model.i + 1) / model.total) * 100}%` }} />
        </div>
        <div className="room-meta">
          <span>
            {t("Spørgsmål {n} af {total}", {
              n: model.i + 1,
              total: model.total,
            })}
          </span>
          {model.category && <span className="chip">{model.category}</span>}
          <span>
            {t("{n} af {total} har svaret", {
              n: model.answered,
              total: model.playerCount,
            })}
          </span>
        </div>
        <div className="room-question-row">
          <h1 className="room-prompt">{model.prompt}</h1>
          {model.limitMs > 0 && <TimerRing left={left} limit={model.limitMs} />}
        </div>
        <div
          className={`room-tiles ${model.options.length === 2 ? "two" : ""}`}
        >
          {model.options.map((o, i) => (
            <AnswerTile
              key={o.id}
              index={i}
              text={o.text}
              state={
                pickedId ? (pickedId === o.id ? "picked" : "dim") : undefined
              }
              onClick={onAnswer ? () => onAnswer(o.id) : undefined}
              disabled={Boolean(pickedId)}
            />
          ))}
        </div>
        <ul className="room-answered" aria-hidden="true">
          {model.players.map((p) => (
            <li key={p.id} className={answered.has(p.id) ? "done" : ""}>
              {p.avatar}
            </li>
          ))}
        </ul>
        {children}
      </div>
    );
  }

  if (model.phase === "reveal") {
    const total = model.options.reduce((sum, o) => sum + (o.count ?? 0), 0);
    return (
      <div className="room-stage">
        <div className="room-progress" aria-hidden="true">
          <i style={{ width: `${((model.i + 1) / model.total) * 100}%` }} />
        </div>
        <div className="room-meta">
          <span>
            {t("Spørgsmål {n} af {total}", {
              n: model.i + 1,
              total: model.total,
            })}
          </span>
          {model.category && <span className="chip">{model.category}</span>}
          <span>
            {t("{n} af {total} svarede rigtigt", {
              n: model.correctCount,
              total: model.playerCount,
            })}
          </span>
        </div>
        <h1 className="room-prompt">{model.prompt}</h1>
        <div
          className={`room-tiles ${model.options.length === 2 ? "two" : ""}`}
        >
          {model.options.map((o, i) => (
            <AnswerTile
              key={o.id}
              index={i}
              text={o.text}
              count={o.count ?? 0}
              share={total > 0 ? (o.count ?? 0) / total : 0}
              state={o.correct ? "correct" : "dim"}
            />
          ))}
        </div>
        {model.explanation && (
          <p className="room-explanation">{model.explanation}</p>
        )}
        <Leaderboard rows={model.board} gained={model.gained} />
        {children}
      </div>
    );
  }

  return (
    <div className="room-stage room-end">
      <div className="winner-crown" aria-hidden="true">
        👑
      </div>
      <h1 className="room-winner">
        {model.board[0]
          ? model.winners > 1
            ? t("Delt sejr!")
            : t("{avatar} {name} vinder!", {
                avatar: model.board[0].avatar,
                name: model.board[0].name,
              })
          : t("Spillet er slut")}
      </h1>
      <Podium rows={model.board} />
      {model.board.length > 3 && <Leaderboard rows={model.board.slice(3)} />}
      {children}
    </div>
  );
}
