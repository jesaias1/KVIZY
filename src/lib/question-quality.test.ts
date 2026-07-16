import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "@/data/questions";
import {
  auditQuestion,
  effectiveQualityScore,
  hasAnswerLeak,
  hasUsefulExplanation,
} from "./question-quality";
import { normalizeText } from "./engine";

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

  it("har korte, unikke og læsevenlige svarmuligheder", () => {
    for (const question of SEED_QUESTIONS) {
      const optionKeys = question.options.map((option) =>
        normalizeText(option.text),
      );
      expect(new Set(optionKeys).size).toBe(optionKeys.length);
      expect(question.options.every((option) => option.text.length <= 70)).toBe(
        true,
      );
      expect(
        question.options.every(
          (option) =>
            !/^\p{Ll}/u.test(option.text) ||
            /^(iPhone|iPad|iOS|iPod|eBay|macOS)\b/.test(option.text),
        ),
      ).toBe(true);
    }
  });

  it("indeholder ingen maskinagtige udsagn eller gentagne prompts", () => {
    expect(
      SEED_QUESTIONS.some((question) =>
        [question.prompt, question.explanation, ...question.options.map((o) => o.text)].some(
          (text) =>
            /registreret som|centrale sammenhæng|final version|\s{2,}|\.\./i.test(
              text,
            ),
        ),
      ),
    ).toBe(false);
    expect(
      new Set(SEED_QUESTIONS.map((question) => normalizeText(question.prompt)))
        .size,
    ).toBe(SEED_QUESTIONS.length);
  });

  it("afviser spørgsmål, der røber svaret i formuleringen", () => {
    const base = SEED_QUESTIONS[0];
    const leaked = {
      ...base,
      prompt: "Hvem grundlagde Ford Motor Company?",
      type: "multiple_choice" as const,
      options: [
        { id: "o1", text: "Henry Ford" },
        { id: "o2", text: "Walter Chrysler" },
        { id: "o3", text: "Louis Chevrolet" },
        { id: "o4", text: "Enzo Ferrari" },
      ],
      correctOptionId: "o1",
    };
    expect(hasAnswerLeak(leaked)).toBe(true);
    expect(SEED_QUESTIONS.some(hasAnswerLeak)).toBe(false);
  });

  it("skelner mellem opdagelser, udvikling og opfindelser", () => {
    const europa = SEED_QUESTIONS.find(
      (question) => question.id === "wikithin-invention-inventor-Q3143",
    );
    expect(europa?.prompt).toBe(
      "Hvem opdagede Jupiters måne Europa i 1610?",
    );
    expect(europa?.prompt).not.toMatch(/opfind/i);
    expect(europa?.categoryId).toBe("cat-8");
    expect(
      SEED_QUESTIONS.some((question) => /Deal\/No Deal/i.test(question.prompt)),
    ).toBe(false);
  });

  it("formulerer Nidarosdomen præcist med korte navnesvar", () => {
    const question = SEED_QUESTIONS.find((item) =>
      item.prompt.includes("Nidarosdomen"),
    );
    expect(question?.prompt).toBe(
      "Hvem var den første domkirkearkitekt under restaureringen af Nidarosdomen?",
    );
    expect(question?.options.every((option) => option.text.length < 40)).toBe(
      true,
    );
  });
});
