export const APP_CONFIG = {
  name: "KVIZY",
  tagline: "Vælg. Tænk. Vind.",
  storageVersion: 2,
  gameKey: "kvizy-active-game-v2",
  historyKey: "kvizy-history-v1",
  seenKey: "kvizy-seen-v1",
  settingsKey: "kvizy-settings-v1",
  reportsKey: "kvizy-question-reports-v1",
} as const;

export const DIFFICULTY_LABELS = [
  "",
  "Meget let",
  "Let",
  "Almindelig",
  "Svær",
  "Ekspert",
] as const;
