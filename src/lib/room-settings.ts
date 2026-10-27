import { CATEGORIES, DEFAULT_CATEGORIES } from "./categories";
import { ROOM_COUNTS, ROOM_LIMITS_SEC } from "./room-protocol";

// Det, værten har valgt til rummet. Huskes på enheden, så en ny aften starter
// med de samme indstillinger.

export type RoomSettings = {
  count: number;
  /** 0 = ingen tidsgrænse. */
  limitSec: number;
  level: number;
  /** Værten spiller selv med på skærmen. */
  hostPlays: boolean;
  categoryIds: string[];
};

const KEY = "kvizy-room-settings-v1";

export const defaultRoomSettings = (): RoomSettings => ({
  count: 15,
  limitSec: 20,
  level: 3,
  hostPlays: false,
  categoryIds: DEFAULT_CATEGORIES.map((category) => category.id),
});

/** Retter en gemt eller ændret indstilling til noget, spillet kan bruge. */
export function normalizeRoomSettings(raw: unknown): RoomSettings {
  const base = defaultRoomSettings();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<RoomSettings>;
  const known = new Set(CATEGORIES.map((category) => category.id));
  const categoryIds = Array.isArray(value.categoryIds)
    ? [
        ...new Set(
          value.categoryIds.filter(
            (id): id is string => typeof id === "string" && known.has(id),
          ),
        ),
      ]
    : [];
  return {
    count: (ROOM_COUNTS as readonly number[]).includes(value.count ?? 0)
      ? (value.count as number)
      : base.count,
    limitSec:
      typeof value.limitSec === "number" &&
      (ROOM_LIMITS_SEC as readonly number[]).includes(value.limitSec)
        ? value.limitSec
        : base.limitSec,
    hostPlays: value.hostPlays === true,
    level:
      typeof value.level === "number" && value.level >= 1 && value.level <= 5
        ? Math.round(value.level)
        : base.level,
    categoryIds: categoryIds.length > 0 ? categoryIds : base.categoryIds,
  };
}

export function loadRoomSettings(): RoomSettings {
  try {
    return normalizeRoomSettings(
      JSON.parse(localStorage.getItem(KEY) ?? "null"),
    );
  } catch {
    return defaultRoomSettings();
  }
}

export function saveRoomSettings(settings: RoomSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Indstillingerne huskes bare ikke til næste gang.
  }
}
