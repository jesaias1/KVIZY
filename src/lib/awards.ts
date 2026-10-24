import type { Game } from "./types";
import { getLang, t } from "./i18n";

export type Award = {
  id: string;
  emoji: string;
  title: string;
  playerId: string;
  detail: string;
};

/**
 * Uddeler lette titler efter en flerspillerrunde. Hver spiller får højst én,
 * og kun hvis forskellen er tydelig, så titlerne føles fortjente.
 */
export function computeAwards(game: Game): Award[] {
  const players = game.setup.players;
  if (players.length < 2 || game.answers.length < 6) return [];
  const questionById = new Map(game.questions.map((q) => [q.id, q]));
  const candidates: (Award & { value: number })[] = [];
  const perPlayer = players.map((player) => {
    const mine = game.answers.filter((a) => a.playerId === player.id);
    const right = mine.filter((a) => a.correct);
    return {
      player,
      right,
      avgMs:
        right.length >= 2
          ? right.reduce((sum, a) => sum + a.responseMs, 0) / right.length
          : Infinity,
      hard: right.filter(
        (a) => (questionById.get(a.questionId)?.difficulty ?? 0) >= 4,
      ).length,
    };
  });
  const fastest = [...perPlayer].sort((a, b) => a.avgMs - b.avgMs)[0];
  if (fastest && Number.isFinite(fastest.avgMs))
    candidates.push({
      id: "fastest",
      emoji: "⚡",
      title: t("Hurtigste finger"),
      playerId: fastest.player.id,
      detail: t("{sek} sek. i snit", {
        sek: (fastest.avgMs / 1000)
          .toFixed(1)
          .replace(".", getLang() === "en" ? "." : ","),
      }),
      value: 3,
    });
  const streaker = [...players].sort(
    (a, b) => b.longestStreak - a.longestStreak,
  )[0];
  if (streaker.longestStreak >= 3)
    candidates.push({
      id: "streak",
      emoji: "🔥",
      title: t("Stime-kongen"),
      playerId: streaker.id,
      detail: t("{longestStreak} rigtige i træk", {
        longestStreak: streaker.longestStreak,
      }),
      value: 2,
    });
  const brain = [...perPlayer].sort((a, b) => b.hard - a.hard)[0];
  if (brain && brain.hard >= 2)
    candidates.push({
      id: "brain",
      emoji: "🧠",
      title: t("Svære knaster"),
      playerId: brain.player.id,
      detail: t("{hard} svære spørgsmål klaret", { hard: brain.hard }),
      value: 1,
    });
  // Hver spiller får højst én titel – den mest sjældne først.
  const used = new Set<string>();
  const result: Award[] = [];
  for (const candidate of candidates.sort((a, b) => b.value - a.value)) {
    if (used.has(candidate.playerId)) continue;
    used.add(candidate.playerId);
    const { value: _value, ...award } = candidate;
    void _value;
    result.push(award);
  }
  return result;
}
