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
