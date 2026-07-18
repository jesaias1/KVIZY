import { fingerprint } from "@/lib/engine";
import type { Question } from "@/lib/types";

const prompt = "Hvad skaber ofte reggaemusikkens karakteristiske rytmiske vip?";
const correct = "Korte akkorder, der markerer de svage taktslag";
const createdAt = "2026-07-18T18:00:00.000Z";

export const EDITORIAL_FILL_QUESTIONS: Question[] = [
  {
    id: "music-quality-reggae-offbeat-001",
    prompt,
    type: "multiple_choice",
    categoryId: "cat-21",
    secondaryCategoryIds: ["cat-36"],
    difficulty: 3,
    options: [
      { id: "o1", text: correct },
      { id: "o2", text: "En stortromme, der spiller fire slag i hver takt" },
      { id: "o3", text: "En melodi, der konsekvent ligger foran tempoet" },
      { id: "o4", text: "Lange akkorder, der kun begynder på første taktslag" },
    ],
    correctOptionId: "o1",
    explanation:
      "I meget reggae markerer guitar eller keyboard de svage taktslag med korte akkorder, ofte kaldet skank. Sammen med bas og trommer giver det musikken dens karakteristiske rytmiske vip.",
    sourceLabel: "KVIZY · redaktionel musikbank",
    tags: ["musik", "reggae", "rytme", "redaktionel"],
    origin: "curated",
    status: "active",
    fingerprint: fingerprint(prompt, correct, "multiple_choice"),
    qualityScore: 96,
    timeSensitive: false,
    createdAt,
    updatedAt: createdAt,
    playCount: 0,
    correctRate: 0,
    reportCount: 0,
  },
];
