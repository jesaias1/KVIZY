export const APP_CONFIG = {
  name: "KVIZY",
  tagline: "Vælg. Tænk. Vind.",
  storageVersion: 1,
  gameKey: "kvizy-active-game-v1",
  historyKey: "kvizy-history-v1",
  seenKey: "kvizy-seen-v1",
  settingsKey: "kvizy-settings-v1",
} as const;

export const DIFFICULTY_LABELS = [
  "Næsten umuligt at svare forkert", "Meget let", "Let", "Let+", "Almindelig",
  "Mellem", "Mellem+", "Udfordrende", "Svær", "Meget svær", "Ekspert",
] as const;
