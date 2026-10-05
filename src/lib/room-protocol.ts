import { z } from "zod";
import { ANIMAL_AVATARS } from "./config";

// Fælles beskeder mellem værten (storskærmen) og spillernes telefoner. Værten
// er autoriteten: telefonerne sender kun navn og svar, og værten svarer med
// det, de må se. Alt indkommende valideres, fordi enhver med en kode kan
// sende hvad som helst.

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 4;
export const ROOM_MAX_PLAYERS = 40;
export const ROOM_NAME_MAX = 16;
export const ROOM_PEER_PREFIX = "kvizy-rum-";

export const makeRoomCode = (random: () => number = Math.random) =>
  Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)],
  ).join("");

/** Gør en indtastet kode ensartet og afviser alt, der ikke ligner en kode. */
export function normalizeRoomCode(input: string): string | null {
  const code = input
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
  return code.length === ROOM_CODE_LENGTH &&
    [...code].every((c) => ROOM_CODE_ALPHABET.includes(c))
    ? code
    : null;
}

export const roomPeerId = (code: string) => `${ROOM_PEER_PREFIX}${code}`;

export function sanitizeRoomName(input: string): string {
  const clean = input
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ROOM_NAME_MAX);
  return clean || "Spiller";
}

export const safeRoomAvatar = (avatar: string) =>
  (ANIMAL_AVATARS as readonly string[]).includes(avatar) ? avatar : "🐶";

// ── Telefon → vært ─────────────────────────────────────────
export const clientMessageSchema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("hello"),
    pid: z.string().min(8).max(48),
    name: z.string().max(60),
    avatar: z.string().max(16),
  }),
  z.object({
    t: z.literal("answer"),
    i: z.number().int().min(0).max(500),
    o: z.string().min(1).max(160),
  }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

// ── Vært → telefon ─────────────────────────────────────────
export type RoomPublicPlayer = { id: string; name: string; avatar: string };
export type RoomStanding = RoomPublicPlayer & { score: number };
export type RoomQuestionPayload = {
  i: number;
  total: number;
  prompt: string;
  qType: string;
  category: string;
  options: { id: string; text: string }[];
  limitMs: number;
  remainingMs: number;
};
export type HostMessage =
  | { t: "welcome"; you: RoomPublicPlayer; players: RoomPublicPlayer[] }
  | { t: "lobby"; players: RoomPublicPlayer[] }
  | ({ t: "question" } & RoomQuestionPayload)
  | {
      t: "reveal";
      i: number;
      correctId: string;
      you: {
        correct: boolean;
        answered: boolean;
        points: number;
        score: number;
        rank: number;
        streak: number;
      };
      leaders: RoomStanding[];
    }
  | {
      t: "end";
      standings: RoomStanding[];
      you: { rank: number; score: number };
    }
  | { t: "full" }
  | { t: "closed" };
