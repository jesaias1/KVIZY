import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "@/data/questions";
import {
  auditQuestion,
  effectiveQualityScore,
  hasUsefulExplanation,
} from "./question-quality";

describe("automatisk spørgsmålskvalitet", () => {
  it("skjuler generiske faktafelter", () => {
    expect(
      hasUsefulExplanation(
        "Det korrekte svar er København. Det er den centrale sammenhæng, spørgsmålet tester.",
      ),
    ).toBe(false);
    expect(
      hasUsefulExplanation(
        "København blev residensstad i middelalderen og er i dag Danmarks hovedstad.",
      ),
    ).toBe(true);
  });

  it("trækker fejl og advarsler fra kvalitetsscoren", () => {
    const base = SEED_QUESTIONS[0];
    const weak = {
      ...base,
      explanation: "Det korrekte svar er A.",
      sourceLabel: undefined,
      sourceUrl: undefined,
      qualityScore: 70,
    };
    expect(auditQuestion(weak).length).toBeGreaterThanOrEqual(3);
    expect(effectiveQualityScore(weak)).toBeLessThan(70);
  });

  it("banken indeholder ingen emoji-gæt", () => {
    expect(
      SEED_QUESTIONS.some((question) => question.type === ("emoji" as never)),
    ).toBe(false);
  });
});
