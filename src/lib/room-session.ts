import type { RoomPhase, RoomState } from "./room-game";
import { normalizeRoomCode } from "./room-protocol";

const RESUME_KEY = "kvizy-room-resume-v1";
const MAX_AGE_MS = 3 * 3600_000;

export type Resume = { code: string; name: string; avatar: string };

/** Husker rummet, så en genindlæst telefon kommer direkte tilbage. */
export function readResume(): Resume | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? "null") as
      (Resume & { at?: number }) | null;
    if (!raw || Date.now() - (raw.at ?? 0) > MAX_AGE_MS) return null;
    return normalizeRoomCode(raw.code)
      ? { code: raw.code, name: raw.name, avatar: raw.avatar }
      : null;
  } catch {
    return null;
  }
}

export function saveResume(resume: Resume) {
  try {
    sessionStorage.setItem(
      RESUME_KEY,
      JSON.stringify({ ...resume, at: Date.now() }),
    );
  } catch {
    // Genindlæsning bringer så bare spilleren til formularen.
  }
}

export function clearResume() {
  try {
    sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // Intet at rydde.
  }
}

// ── Værtens rum overlever en genindlæsning ──────────────────

const HOST_KEY = "kvizy-room-host-v1";
const HOST_MAX_AGE_MS = 3 * 3600_000;
const PHASES: RoomPhase[] = ["lobby", "question", "reveal", "end"];

export type HostSession = { code: string; state: RoomState };

/** Genopretter en gemt tilstand, hvis den ser rigtig ud. Alle starter fraværende. */
export function reviveRoomState(raw: unknown): RoomState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<RoomState>;
  if (!s.phase || !PHASES.includes(s.phase)) return null;
  if (!Array.isArray(s.players) || !Array.isArray(s.questions)) return null;
  if (typeof s.index !== "number" || typeof s.startedAt !== "number")
    return null;
  if (typeof s.limitMs !== "number" || s.limitMs <= 0) return null;
  if (s.phase !== "lobby" && !s.questions[s.index]) return null;
  const players = s.players
    .filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.score === "number",
    )
    .map((p) => ({ ...p, connected: false }));
  return {
    phase: s.phase,
    players,
    questions: s.questions,
    index: s.index,
    limitMs: s.limitMs,
    startedAt: s.startedAt,
    answers: s.answers && typeof s.answers === "object" ? s.answers : {},
    results: s.results && typeof s.results === "object" ? s.results : {},
  };
}

export function readHostSession(): HostSession | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(HOST_KEY) ?? "null") as {
      code?: string;
      state?: unknown;
      at?: number;
    } | null;
    if (!raw?.code || !normalizeRoomCode(raw.code)) return null;
    if (Date.now() - (raw.at ?? 0) > HOST_MAX_AGE_MS) return null;
    const state = reviveRoomState(raw.state);
    return state ? { code: raw.code, state } : null;
  } catch {
    return null;
  }
}

export function saveHostSession(code: string, state: RoomState) {
  try {
    sessionStorage.setItem(
      HOST_KEY,
      JSON.stringify({ code, state, at: Date.now() }),
    );
  } catch {
    // Rummet overlever så bare ikke en genindlæsning.
  }
}

export function clearHostSession() {
  try {
    sessionStorage.removeItem(HOST_KEY);
  } catch {
    // Intet at rydde.
  }
}
